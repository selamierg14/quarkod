"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  actingAccountId,
  allowedBusinessIds,
  canAccessBusiness,
  hashPassword,
  requireKullaniciYonetimi,
  requireUser,
  setSessionCookie,
  userScope,
  requireYazma,
} from "@/lib/kimlik/auth";
import { denetimYaz } from "@/lib/rapor/denetim";
import { acilabilirRoller, yonetebilirMi } from "@/lib/kimlik/panel";
import { gecerliRolMu } from "@/lib/kimlik/session-token";
import { sifreSorunu, yeniSifreSorunu } from "@/lib/kimlik/sifre";
import { prisma } from "@/lib/cekirdek/db";
import { istenenModulleriSuz, modulleriGuncelleMeli } from "@/lib/kimlik/moduller";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/kimlik/username";
import { ekTelefonlariCoz } from "@/lib/kimlik/telefonlar";
import { uniqueConstraintMessage } from "@/lib/cekirdek/unique-error";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { ilkHata, listeAlani } from "@/lib/cekirdek/girdi";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";

/**
 * Bir listedeki İŞLETMELERİN HEPSİNE yetki var mı — tek sorguyla.
 *
 * `canAccessBusiness` tek işletme için doğru ama döngüde çağrılınca her
 * eleman için yeniden hesap/atama sorgusu atıyor. Bölge müdürü ataması
 * onlarca işletme taşıyabildiği için burada izinli kimlikler bir kez
 * okunup kümede aranıyor; kural aynı, gidiş dönüş bir tane.
 */
async function hepsineYetkiliMi(
  actor: Awaited<ReturnType<typeof requireKullaniciYonetimi>>,
  isletmeIdleri: string[],
): Promise<boolean> {
  if (isletmeIdleri.length === 0) return true;
  const izinliler = new Set(await allowedBusinessIds(actor));
  return isletmeIdleri.every((id) => izinliler.has(id));
}

/**
 * Bir bölge müdürüne atanabilecek en fazla işletme.
 *
 * Sınır iki iş görüyor: her eleman bir `userBusiness` satırına dönüşüyor,
 * ve gerçek bir zincirin bölge sayısı bunun çok altında. Sınırsızken elle
 * kurulmuş tek bir istek binlerce satır yazdırabiliyordu.
 */
const EN_COK_BOLGE_ISLETMESI = 200;

export type UserFormState = { error?: string; saved?: string };

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  // Hem hesap sahibi hem işletme sorumlusu hem bölge müdürü buradan
  // kullanıcı açabilir; kimin hangi rolü açabileceği ve hangi işletmeye
  // atayabileceği aşağıda acilabilirRoller() ve canAccessBusiness() ile
  // ayrıca doğrulanıyor — bu kapı yalnızca "panele giren biri mi" sorusuna
  // bakar.
  const actor = await requireKullaniciYonetimi();
  await requireYazma();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  // Bölge müdürü birden çok işletmeye atanır; form aynı adla çoklu değer
  // yollar. Liste SINIRLI: her eleman aşağıda bir `userBusiness` satırına
  // dönüşüyor ve sınırsızken elle kurulmuş tek bir istek binlerce satır
  // yazdırabiliyordu. Tekrarlar da ayıklanıyor (aynı işletmenin iki kez
  // gönderilmesi tekillik hatasına düşürüyordu).
  const bolgeSonuc = listeAlani(
    formData.getAll("bolgeIsletmeleri"),
    "Bölge işletmeleri",
    { enCok: EN_COK_BOLGE_ISLETMESI },
  );
  if (!bolgeSonuc.ok) return { error: bolgeSonuc.hata };
  const bolgeIsletmeleri = bolgeSonuc.deger;
  const password = String(formData.get("password") ?? "");

  // Ad, e-posta ve şifre sınırsızdı; üçü de doğrudan veritabanına
  // gidiyordu. Biçim kuralları artık desenler.ts'ten — aynı e-posta deseni
  // önceden bu dosyada, isletmeler/actions.ts'te ve deneme/actions.ts'te
  // ayrı ayrı yazılıydı.
  const alanHatasi = ilkHata(
    alanDogrula(name, "kisiAdi", "Ad soyad"),
    alanDogrula(email, "eposta", "E-posta"),
    alanDogrula(password, "sifre", "Şifre"),
    alanDogrula(rawPhone, "telefon", "Telefon"),
  );
  if (alanHatasi) return { error: alanHatasi };

  const username = rawUsername || toUsername(email.split("@")[0]);
  const usernameSorun = usernameProblem(username);
  if (usernameSorun) return { error: usernameSorun };

  // 2FA kodu buraya gideceği için telefon zorunlu.
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "Geçerli bir cep telefonu girin (5XX...)." };

  // Yedek numaralar. Rol kısıtı (garson ekleyemez) ve üst sınır
  // lib/kimlik/telefonlar.ts'te; arayüz alanı gizlese de kural burada
  // uygulanıyor çünkü form elle kurulabilir.
  const yedekler = ekTelefonlariCoz(formData.getAll("ekTelefonlar"), {
    role,
    birincil: phone,
  });
  if (!yedekler.ok) return { error: yedekler.hata };

  if (!gecerliRolMu(role) || !acilabilirRoller(actor.role).includes(role)) {
    // Hesap sahibi kendine eş yetkide ikinci bir sahip açamaz: sahiplik
    // aboneliği ve faturayı taşıyan roldür, onu platform tarafı belirler.
    // Aksi halde bir müşteri hesabında kimin sorumlu olduğu belirsizleşir.
    return { error: "Bu rolü açma yetkiniz yok." };
  }
  if ((role === "manager" || role === "garson") && !businessId) {
    return { error: "Bir işletme seçin." };
  }
  if (role === "bolge" && bolgeIsletmeleri.length === 0) {
    return { error: "Bölge müdürü için en az bir işletme seçin." };
  }

  // Yeni kullanıcı ekleyenin hesabına açılır ve yalnızca o hesabın
  // işletmesine atanabilir; aksi halde bir kiracı diğerinin işletmesine
  // kullanıcı yerleştirebilirdi.
  //
  // Tek istisna platform yöneticisi: bir hesaba "girmeden" de kullanıcı
  // açabiliyor, hedef hesabı formdan seçiyor. Önceden burası "önce bir
  // hesaba geçin" hatası veriyordu ama menüdeki Kullanıcılar > Ekle
  // bağlantısı tam da oraya gidiyordu — bağlantı çalışmayan bir duvara
  // çıkıyordu.
  const aktifHesap = await actingAccountId(actor);
  const secilenHesap = String(formData.get("hedefHesapId") ?? "").trim();
  const accountId =
    aktifHesap ?? (actor.role === "superadmin" ? secilenHesap : null);

  if (!accountId) {
    return {
      error:
        actor.role === "superadmin"
          ? "Kullanıcının açılacağı hesabı seçin."
          : "Hesabınız bulunamadı.",
    };
  }
  // Seçilen hesap gerçekten var mı? Yalnızca platform yöneticisi bu yola
  // girebiliyor ama kimlik yine de doğrulanmalı.
  if (!aktifHesap && !(await prisma.account.findUnique({ where: { id: accountId } }))) {
    return { error: "Seçilen hesap bulunamadı." };
  }
  if (businessId && !(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye kullanıcı atama yetkiniz yok." };
  }
  // Her işletme doğrulanıyor (form manipüle edilip başka kiracının
  // işletmesi eklenemesin) ama DÖNGÜ İÇİNDE SORGU YOK: canAccessBusiness
  // her çağrıda 2-3 sorgu atıyordu, on işletmeli bir bölge müdürü için
  // otuz gidiş dönüş. İzinli kimlikler bir kez okunup kümede aranıyor.
  if (!(await hepsineYetkiliMi(actor, bolgeIsletmeleri))) {
    return { error: "Seçilen işletmelerden birine yetkiniz yok." };
  }

  const problem = sifreSorunu(password);
  if (problem) return { error: problem };

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Bu e-posta zaten kayıtlı." };
  }
  if (await prisma.user.findUnique({ where: { username } })) {
    return { error: `"${username}" kullanıcı adı zaten alınmış.` };
  }

  // Ön kontrol ile INSERT arasında başka bir istek aynı adı alabilir; bu
  // yüzden veritabanının tekillik hatasını da yakalıyoruz.
  try {
    await prisma.user.create({
      data: {
        accountId,
        name,
        username,
        email,
        phone,
        role,
        businessId: role === "manager" || role === "garson" ? businessId : null,
        passwordHash: await hashPassword(password),
        // Modül dağıtamayan bir rol formu göndermişse liste boş kalır
        // (istenenModulleriSuz kesişimi zaten boş döner).
        moduller: istenenModulleriSuz(
          actor.role,
          actor.moduller,
          formData.getAll("moduller").map((v) => String(v)),
        ),
        ...(role === "bolge"
          ? {
              businesses: {
                create: bolgeIsletmeleri.map((id) => ({ businessId: id })),
              },
            }
          : {}),
        ...(yedekler.deger.length > 0
          ? {
              telefonlar: {
                create: yedekler.deger.map((numara, sira) => ({ phone: numara, sira })),
              },
            }
          : {}),
      },
    });
  } catch (error) {
    const mesaj = uniqueConstraintMessage(error);
    if (mesaj) return { error: mesaj };
    throw error;
  }

  await denetimYaz(actor, "user.create", {
    entity: "user",
    detail: `${name} (${role}) eklendi`,
  });

  revalidatePath("/admin/kullanicilar");
  return { saved: `${name} eklendi. Giriş kullanıcı adı: ${username}` };
}

/**
 * Var olan bir kullanıcının bilgilerini, rolünü ve modül izinlerini günceller.
 *
 * Şifre burada değişmez — o, ayrı ve denetimi daha sıkı olan "Şifre sıfırla"
 * akışında kalıyor. Kişi kendi kaydını bu formdan düzenleyemez: rolünü ya da
 * iznini yanlışlıkla kısıtlayıp kendini kilitleyebilirdi; kendi bilgilerini
 * Profil sayfasından değiştirir.
 */
export async function updateUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireKullaniciYonetimi();
  await requireYazma();

  const id = String(formData.get("id") ?? "");
  if (id === actor.id) {
    return { error: "Kendi kaydınızı buradan düzenleyemezsiniz. Profil sayfasını kullanın." };
  }

  const target = await prisma.user.findFirst({ where: { id, ...await userScope(actor) } });
  if (!target) return { error: "Kullanıcı bulunamadı." };
  // Kıdem kapısı: kapsam filtresi "hangi kiracının kullanıcısı" sorusunu
  // cevaplıyor, bu satır "hangi kıdemdeki kullanıcı" sorusunu. İkisi
  // ayrı — bkz. lib/panel.ts, yonetebilirMi.
  if (!yonetebilirMi(actor.role, target.role)) {
    return { error: "Bu kullanıcı üzerinde işlem yapma yetkiniz yok." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  const bolgeSonuc = listeAlani(
    formData.getAll("bolgeIsletmeleri"),
    "Bölge işletmeleri",
    { enCok: EN_COK_BOLGE_ISLETMESI },
  );
  if (!bolgeSonuc.ok) return { error: bolgeSonuc.hata };
  const bolgeIsletmeleri = bolgeSonuc.deger;
  // Formdan gelen modüller iki süzgeçten geçiyor: tanınmayan anahtarlar
  // atılıyor ve actor'ın KENDİ sahip olmadıkları düşülüyor. İkincisi asıl
  // güvenlik kapısı — form alanı gizlense bile istek elle kurulabilir, ve
  // modül dağıtma yetkisi olmayan bir rol (bölge/sorumlu) için
  // verilebilirModuller boş döndüğü için sonuç da boş kalır.
  const istenenModuller = formData.getAll("moduller").map((v) => String(v));
  const modullerGonderildi = formData.get("modullerGonderildi") === "1";

  const alanHatasi = ilkHata(
    alanDogrula(name, "kisiAdi", "Ad soyad"),
    alanDogrula(email, "eposta", "E-posta"),
    alanDogrula(rawPhone, "telefon", "Telefon"),
  );
  if (alanHatasi) return { error: alanHatasi };

  const username = rawUsername || toUsername(email.split("@")[0]);
  const usernameSorun = usernameProblem(username);
  if (usernameSorun) return { error: usernameSorun };

  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "Geçerli bir cep telefonu girin (5XX...)." };

  // Hedef kullanıcı zaten "owner" ise rolü değiştirtmiyoruz: sahiplik
  // aboneliği taşıyan roldür, panelden düşürülmesi platform tarafının işi.
  if (target.role !== "owner") {
    if (!gecerliRolMu(role) || !acilabilirRoller(actor.role).includes(role)) {
      return { error: "Bu rolü atama yetkiniz yok." };
    }
  }
  const etkinRol = target.role === "owner" ? "owner" : role;

  if ((etkinRol === "manager" || etkinRol === "garson") && !businessId) {
    return { error: "Bir işletme seçin." };
  }
  if (etkinRol === "bolge" && bolgeIsletmeleri.length === 0) {
    return { error: "Bölge müdürü için en az bir işletme seçin." };
  }
  if (businessId && !(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye kullanıcı atama yetkiniz yok." };
  }
  if (!(await hepsineYetkiliMi(actor, bolgeIsletmeleri))) {
    return { error: "Seçilen işletmelerden birine yetkiniz yok." };
  }

  // Yedek numaralar ETKİN role göre denetleniyor: sahipliği korunan bir
  // kullanıcıda formdan gelen rol yok sayılıyor (etkinRol), kısıt da o
  // role göre uygulanmalı.
  const yedekler = ekTelefonlariCoz(formData.getAll("ekTelefonlar"), {
    role: etkinRol,
    birincil: phone,
  });
  if (!yedekler.ok) return { error: yedekler.hata };

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          name,
          username,
          email,
          phone,
          role: etkinRol,
          businessId: etkinRol === "manager" || etkinRol === "garson" ? businessId : null,
          // Modüllere YALNIZCA form gerçekten modül bloğunu gönderdiyse
          // dokunuluyor. İki koşul birden aranıyor:
          //
          //   1. modulDagitabilirMi — dağıtma yetkisi olmayan bir rol
          //      (sorumlu, bölge müdürü) kimsenin modülünü değiştiremez.
          //   2. modullerGonderildi — blok ekranda çizilmişse form bu gizli
          //      alanı taşır. İşaretsiz kutular gönderilmediği için, bu
          //      işaret olmadan "hepsini kaldırdım" ile "blok hiç yoktu"
          //      ayırt edilemiyordu; sonuç, ilgisiz bir alanı düzeltmek için
          //      formu kaydeden yöneticinin hedefin TÜM modüllerini sessizce
          //      silmesiydi.
          ...(modulleriGuncelleMeli(actor.role, modullerGonderildi)
            ? {
                moduller: istenenModulleriSuz(
                  actor.role,
                  actor.moduller,
                  istenenModuller,
                ),
              }
            : {}),
        },
      }),
      // Yedek numaralar da bölge atamaları gibi tamamen yeniden yazılıyor:
      // form o an ekranda ne gösteriyorsa veritabanı onu yansıtmalı.
      // Kaldırılan bir numaranın kalması, hesaba erişebilecek bir kanalın
      // açık unutulması demekti.
      prisma.userPhone.deleteMany({ where: { userId: id } }),
      ...(yedekler.deger.length > 0
        ? [
            prisma.userPhone.createMany({
              data: yedekler.deger.map((numara, sira) => ({
                userId: id,
                phone: numara,
                sira,
              })),
            }),
          ]
        : []),
      // Bölge atamaları tamamen yeniden yazılır: form o an ekranda ne
      // gösteriyorsa veritabanı da onu yansıtmalı.
      prisma.userBusiness.deleteMany({ where: { userId: id } }),
      ...(etkinRol === "bolge"
        ? [
            prisma.userBusiness.createMany({
              data: bolgeIsletmeleri.map((bid) => ({ userId: id, businessId: bid })),
            }),
          ]
        : []),
    ]);
  } catch (error) {
    const mesaj = uniqueConstraintMessage(error);
    if (mesaj) return { error: mesaj };
    throw error;
  }

  await denetimYaz(actor, "user.update", {
    entity: "user",
    entityId: id,
    detail: `${name} güncellendi`,
  });

  revalidatePath("/admin/kullanicilar");
  revalidatePath(`/admin/kullanicilar/${id}/duzenle`);
  return { saved: "Kullanıcı güncellendi." };
}

export async function resetPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireKullaniciYonetimi();
  await requireYazma();

  const id = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  // Kendi şifresini buradan değiştirmek, Profil'deki SMS doğrulamasını
  // atlamanın kolay yoluydu: açık bırakılmış bir patron oturumunu ele
  // geçiren kişi tek tıkla hesabı devralabiliyordu.
  if (id === actor.id) {
    return {
      error:
        "Kendi şifrenizi buradan değiştiremezsiniz. Profil sayfasından " +
        "değiştirin; telefonunuza doğrulama kodu gönderilecek.",
    };
  }

  const problem = sifreSorunu(password);
  if (problem) return { error: problem };

  const user = await prisma.user.findFirst({
    where: { id, ...await userScope(actor) },
  });
  if (!user) return { error: "Kullanıcı bulunamadı." };
  // Şifre sıfırlama, hesabı devralmanın en kısa yolu: kıdem kapısı olmadan
  // bir bölge müdürü patronun şifresini belirleyip onun yerine giriş
  // yapabiliyordu.
  if (!yonetebilirMi(actor.role, user.role)) {
    return { error: "Bu kullanıcının şifresini sıfırlama yetkiniz yok." };
  }

  // Sıfırlama, o kullanıcının açık oturumlarını da kapatır: şifresi
  // sıfırlanan kişinin panelde kalmaya devam etmesi anlamsız olurdu.
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
      passwordChangedAt: new Date(),
    },
  });

  await denetimYaz(actor, "user.password", {
    entity: "user",
    entityId: id,
    detail: `${user.name} için şifre sıfırlandı`,
  });

  revalidatePath("/admin/kullanicilar");
  return { saved: `${user.name} için yeni şifre belirlendi.` };
}

export async function toggleUser(formData: FormData) {
  const owner = await requireKullaniciYonetimi();
  await requireYazma();
  const id = String(formData.get("userId") ?? "");

  // Patron kendi hesabını kapatıp sistemden kilitlenmesin.
  if (id === owner.id) return;

  const user = await prisma.user.findFirst({
    where: { id, ...await userScope(owner) },
  });
  if (!user) return;
  // Kıdem kapısı: aksi halde bir bölge müdürü patronu pasife alıp hesabı
  // kilitleyebiliyordu.
  if (!yonetebilirMi(owner.role, user.role)) return;

  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  await denetimYaz(owner, "user.toggle", {
    entity: "user",
    entityId: id,
    detail: `${user.name} ${user.active ? "pasife alındı" : "aktifleştirildi"}`,
  });
  revalidatePath("/admin/kullanicilar");
}

export type PasswordState = {
  error?: string;
  saved?: string;
};

/**
 * Kendi şifresini değiştirme — TEK ADIM: mevcut şifre + yeni şifre (iki kez).
 *
 * Kimlik kanıtı mevcut şifrenin kendisi. Bu akış bir süre SMS kodu da
 * istiyordu; kaldırıldı çünkü bedeli faydasından büyüktü: numarası
 * tanımlanmamış bir kullanıcı şifresini HİÇ değiştiremiyordu ve
 * "patronunuzdan numaranızı tanımlamasını isteyin" mesajıyla kalıyordu.
 * Şifre değiştirmek, kilitlenmiş bir kullanıcının kendi başına yapabilmesi
 * gereken ilk şey.
 *
 * Kod hâlâ ŞİFRESİNİ UNUTAN akışında duruyor (admin/giris/actions.ts) ve
 * orada vazgeçilmez: mevcut şifre bilinmediğinde elde tek kanıt telefona
 * ulaşabilmek. Buradaki ile oradaki akışın farkı tam olarak bu.
 *
 * İki kutu SUNUCUDA karşılaştırılıyor (`yeniSifreSorunu`) — tarayıcı
 * kontrolü bir kolaylık, istek elle de kurulabilir.
 */
export async function changeOwnPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await requireUser();

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "Kullanıcı bulunamadı." };

  /**
   * `current` doğrudan bcrypt.compare'e gidiyor ve sınırsızdı: bcrypt'in
   * maliyeti girdiyle artıyor, yani megabaytlık bir "mevcut şifre" tek
   * istekte sunucuyu meşgul edebiliyordu. Oturum gerektiren bir uç olduğu
   * için etkisi giriş formundakinden dar ama sınıf aynı.
   */
  const mevcutSonuc = alanDogrula(formData.get("current"), "girisSifresi", "Mevcut şifre", {
    zorunlu: true,
  });
  if (!mevcutSonuc.ok) return { error: "Mevcut şifre hatalı." };

  // Şifre deneme hızı sınırlı: açık bırakılmış bir oturumu bulan kişi
  // mevcut şifreyi buradan deneyerek aramasın.
  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, user.id);
  if (!sinir.izin) return { error: hizSiniriMesaji(sinir) };

  if (!(await bcrypt.compare(mevcutSonuc.deger, user.passwordHash))) {
    return { error: "Mevcut şifre hatalı." };
  }

  const next = String(formData.get("next") ?? "");
  const sorun = yeniSifreSorunu(next, String(formData.get("repeat") ?? ""));
  if (sorun) return { error: sorun };

  if (await bcrypt.compare(next, user.passwordHash)) {
    return { error: "Yeni şifre eskisiyle aynı olamaz." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
  });

  // Şifre değişimi eski oturumları geçersizleştirdiği için kendi
  // oturumumuzu tazeliyoruz; yoksa kullanıcı kendi işleminden sonra
  // giriş ekranına düşerdi.
  await setSessionCookie({
    // Jeton modül taşımaz; etkin küme her istekte DB'den okunuyor.
    moduller: [],
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "superadmin" | "owner" | "manager",
    accountId: user.accountId,
    businessId: user.businessId,
  });

  return { saved: "Şifreniz değiştirildi." };
}
