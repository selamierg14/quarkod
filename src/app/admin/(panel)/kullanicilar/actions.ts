"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  actingAccountId,
  canAccessBusiness,
  hashPassword,
  requireKullaniciYonetimi,
  requireUser,
  setSessionCookie,
  userScope,
  requireYazma,
} from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { acilabilirRoller } from "@/lib/panel";
import { gecerliRolMu } from "@/lib/session-token";
import { sifreSorunu } from "@/lib/sifre";
import { prisma } from "@/lib/db";
import { istenenModulleriSuz, modulDagitabilirMi } from "@/lib/moduller";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/username";
import { uniqueConstraintMessage } from "@/lib/unique-error";
import { issueOtp, verifyOtp } from "@/lib/otp";
import {
  clearPendingPassword,
  readPendingPassword,
  setPendingPassword,
} from "@/lib/pending-password";

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
  // Bölge müdürü birden çok işletmeye atanır; form aynı adla çoklu değer yollar.
  const bolgeIsletmeleri = formData
    .getAll("bolgeIsletmeleri")
    .map((v) => String(v))
    .filter(Boolean);
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Ad soyad gerekli." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Geçerli bir e-posta girin." };

  const username = rawUsername || toUsername(email.split("@")[0]);
  const usernameSorun = usernameProblem(username);
  if (usernameSorun) return { error: usernameSorun };

  // 2FA kodu buraya gideceği için telefon zorunlu.
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "Geçerli bir cep telefonu girin (5XX...)." };
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

  // Yeni kullanıcı her zaman ekleyenin hesabına açılır ve yalnızca o hesabın
  // işletmesine atanabilir; aksi halde bir kiracı diğerinin işletmesine
  // kullanıcı yerleştirebilirdi.
  const accountId = await actingAccountId(actor);
  if (!accountId) {
    return {
      error: "Önce Hesaplar sayfasından bir hesaba geçin; kullanıcı o hesaba açılacak.",
    };
  }
  if (businessId && !(await canAccessBusiness(actor, businessId))) {
    return { error: "Bu işletmeye kullanıcı atama yetkiniz yok." };
  }
  // Her işletme tek tek doğrulanıyor: form manipüle edilip başka kiracının
  // işletmesi eklenemesin.
  for (const id of bolgeIsletmeleri) {
    if (!(await canAccessBusiness(actor, id))) {
      return { error: "Seçilen işletmelerden birine yetkiniz yok." };
    }
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
        ...(role === "bolge"
          ? {
              businesses: {
                create: bolgeIsletmeleri.map((id) => ({ businessId: id })),
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

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  const bolgeIsletmeleri = formData
    .getAll("bolgeIsletmeleri")
    .map((v) => String(v))
    .filter(Boolean);
  // Formdan gelen modüller iki süzgeçten geçiyor: tanınmayan anahtarlar
  // atılıyor ve actor'ın KENDİ sahip olmadıkları düşülüyor. İkincisi asıl
  // güvenlik kapısı — form alanı gizlense bile istek elle kurulabilir, ve
  // modül dağıtma yetkisi olmayan bir rol (bölge/sorumlu) için
  // verilebilirModuller boş döndüğü için sonuç da boş kalır.
  const istenenModuller = formData.getAll("moduller").map((v) => String(v));

  if (!name) return { error: "Ad soyad gerekli." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Geçerli bir e-posta girin." };

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
  for (const bid of bolgeIsletmeleri) {
    if (!(await canAccessBusiness(actor, bid))) {
      return { error: "Seçilen işletmelerden birine yetkiniz yok." };
    }
  }

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
          // Modül dağıtamayan bir rol formu göndermişse bu alan hiç
          // dokunulmamalı: aksi halde bir sorumlu, kullanıcıyı düzenlerken
          // farkında olmadan modüllerini sıfırlardı.
          ...(modulDagitabilirMi(actor.role)
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

  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  await denetimYaz(owner, "user.toggle", {
    entity: "user",
    entityId: id,
    detail: `${user.name} ${user.active ? "pasife alındı" : "aktifleştirildi"}`,
  });
  revalidatePath("/admin/kullanicilar");
}

export type PasswordState = {
  step: "form" | "kod";
  error?: string;
  saved?: string;
  maskedPhone?: string;
};

/**
 * Kendi şifresini değiştirme — iki adım.
 *
 * 1. Mevcut şifre + yeni şifre doğrulanır, kayıtlı GSM'e kod gider.
 * 2. Kod doğrulanınca şifre değişir.
 *
 * Tek adımda değiştirmek, açık bırakılmış bir oturumu ele geçiren kişinin
 * şifreyi değiştirip hesabı tamamen devralmasına yetiyordu. Kod adımı bunu
 * telefona sahip olma şartına bağlıyor.
 *
 * Yeni şifre 2. adıma kadar bir yerde tutulmalı; oturum çerezinde imzalı ve
 * kısa ömürlü olarak taşınıyor — istemcide düz metin dolaşmıyor.
 */
export async function changeOwnPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await requireUser();
  const step = String(formData.get("step") ?? "form");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { step: "form", error: "Kullanıcı bulunamadı." };

  // --- 2. adım: SMS kodu
  if (step === "kod") {
    const code = String(formData.get("code") ?? "").trim();
    const bekleyen = await readPendingPassword();
    if (!bekleyen) {
      return { step: "form", error: "İşlem zaman aşımına uğradı. Baştan başlayın." };
    }

    // Çerez o anki kullanıcıya bağlı: ortak kullanılan bir tarayıcıda
    // yarım kalmış bir işlemin, sonradan giren başkasının şifresini
    // belirlemesi mümkün olmasın.
    if (bekleyen.userId !== user.id) {
      await clearPendingPassword();
      return { step: "form", error: "İşlem geçersiz. Baştan başlayın." };
    }

    const sonuc = await verifyOtp(user.id, "sifre", code);
    if (!sonuc.ok) {
      return {
        step: "kod",
        error: sonuc.error,
        maskedPhone: String(formData.get("maskedPhone") ?? ""),
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bekleyen.hash, passwordChangedAt: new Date() },
    });
    await clearPendingPassword();

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

    return { step: "form", saved: "Şifreniz değiştirildi." };
  }

  // --- 1. adım: doğrulama + kod gönderimi
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { step: "form", error: "Mevcut şifre hatalı." };
  }
  if (next !== repeat) {
    return { step: "form", error: "Yeni şifreler birbiriyle uyuşmuyor." };
  }

  const problem = sifreSorunu(next);
  if (problem) return { step: "form", error: problem };

  if (await bcrypt.compare(next, user.passwordHash)) {
    return { step: "form", error: "Yeni şifre eskisiyle aynı olamaz." };
  }

  if (!user.phone) {
    return {
      step: "form",
      error:
        "Hesabınızda kayıtlı telefon yok; doğrulama kodu gönderilemiyor. " +
        "Patronunuzdan numaranızı tanımlamasını isteyin.",
    };
  }

  const kod = await issueOtp(user.id, user.phone, "sifre");
  if (!kod.ok) return { step: "form", error: kod.error };

  // Yeni şifre hash'lenmiş hâlde çerezde bekler; düz metin hiçbir yerde durmaz.
  await setPendingPassword(user.id, await hashPassword(next));

  return { step: "kod", maskedPhone: kod.maskedPhone };
}
