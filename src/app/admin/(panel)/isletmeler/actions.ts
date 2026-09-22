"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actingAccountId,
  allowedBusinessIds,
  canAccessBusiness,
  hashPassword,
  requireOwner,
  requireYazma,
  requireIsletmeYonetimi,
} from "@/lib/kimlik/auth";
import { denetimYaz } from "@/lib/rapor/denetim";
import { secenekleriAyristir, secenekleriBirlestir } from "@/lib/isletme/anket-detay";
import { sifreSorunu } from "@/lib/kimlik/sifre";
import { prisma } from "@/lib/cekirdek/db";
import { BUSINESS_TYPES, DEFAULT_CATEGORIES, type BusinessType } from "@/lib/cekirdek/constants";
import { validateImageDataUrl } from "@/lib/isletme/image";
import { normalizePhone, toUsername, usernameProblem } from "@/lib/kimlik/username";
import { slugIleOlustur, slugify } from "@/lib/cekirdek/slug";

/**
 * Tek istekte eklenebilecek en fazla masa ve masa adı uzunluğu.
 *
 * Sınır iki işi birden yapıyor: veriyi makul tutmak ve arkasındaki toplu
 * yazmanın büyüklüğünü sınırlamak. Aralık dalında zaten vardı, virgüllü
 * liste dalında yoktu.
 */
const EN_COK_MASA = 300;
const EN_UZUN_MASA_ADI = 40;
import { googleYorumLinkiGecerliMi } from "@/lib/isletme/google-yorum";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { saatleriCoz, saatleriYaz } from "@/lib/isletme/calisma-saati";
import { ilkHata, metinAlani, sayiAlani } from "@/lib/cekirdek/girdi";

export type FormState = { error?: string; saved?: boolean };

function newQrToken(): string {
  return randomBytes(9).toString("base64url");
}

/**
 * Yeni işletme ekleme sihirbazı: tür seçilince kategori şablonu otomatik
 * oluşturulur ve istenen sayıda masa + QR üretilir.
 */
export async function createBusiness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireOwner();
  await requireYazma();

  // Yeni işletme, işlem yapılan hesaba bağlanır. Platform yöneticisi için bu,
  // Hesaplar sayfasından "geçtiği" hesaptır; hiçbir hesaba geçmemişse hangi
  // kiracıya ait olacağı belirsiz kalır ve işlem reddedilir.
  const accountId = await actingAccountId(user);
  if (!accountId) {
    return {
      error:
        "Önce Hesaplar sayfasından bir hesaba geçin; işletme o hesaba açılacak.",
    };
  }

  const adSonuc = alanDogrula(formData.get("name"), "isletmeAdi", "İşletme adı");
  const masaSayisi = sayiAlani(formData.get("tableCount"), "Masa sayısı", {
    enAz: 0,
    enCok: EN_COK_MASA,
    varsayilan: 0,
  });
  const hataMesaji = ilkHata(adSonuc, masaSayisi);
  if (hataMesaji) return { error: hataMesaji };

  const name = adSonuc.ok ? adSonuc.deger : "";
  const tableCount = masaSayisi.ok ? masaSayisi.deger : 0;
  const type = String(formData.get("type") ?? "");
  if (!(type in BUSINESS_TYPES)) return { error: "Geçerli bir işletme türü seçin." };

  // Sorumlu hesabı isteğe bağlı; girilirse işletmeyle birlikte açılır ki
  // yeni işletmenin sorumlusu ilk günden panele girebilsin.
  const managerName = String(formData.get("managerName") ?? "").trim();
  const managerEmail = String(formData.get("managerEmail") ?? "").trim().toLowerCase();
  const managerUsername = String(formData.get("managerUsername") ?? "").trim().toLowerCase();
  const managerPhone = String(formData.get("managerPhone") ?? "").trim();
  const managerPassword = String(formData.get("managerPassword") ?? "");
  const wantsManager = Boolean(managerName || managerEmail || managerPassword);

  let username = "";
  let phone: string | null = null;

  if (wantsManager) {
    // Biçim kuralları desenler.ts'ten; aynı e-posta deseni önceden üç ayrı
    // dosyada elle yazılmıştı ve üçü de birbirinden farklıydı.
    const sorumluHata = ilkHata(
      alanDogrula(managerName, "kisiAdi", "Sorumlu adı"),
      alanDogrula(managerEmail, "eposta", "Sorumlu e-postası"),
      alanDogrula(managerPassword, "sifre", "Sorumlu şifresi"),
      alanDogrula(managerPhone, "telefon", "Sorumlu telefonu"),
    );
    if (sorumluHata) return { error: sorumluHata };

    const sifreHatasi = sifreSorunu(managerPassword);
    if (sifreHatasi) return { error: `Sorumlu şifresi: ${sifreHatasi}` };

    username = managerUsername || toUsername(managerEmail.split("@")[0]);
    const usernameSorun = usernameProblem(username);
    if (usernameSorun) return { error: usernameSorun };

    phone = normalizePhone(managerPhone);
    if (!phone) {
      return { error: "Sorumlu için geçerli bir cep telefonu girin (5XX...)." };
    }

    if (await prisma.user.findUnique({ where: { email: managerEmail } })) {
      return { error: "Bu e-posta zaten kayıtlı." };
    }
    if (await prisma.user.findUnique({ where: { username } })) {
      return { error: `"${username}" kullanıcı adı zaten alınmış.` };
    }
  }

  // Görünüşte ikincil olan bu üç alan da veritabanına DOĞRULANMADAN
  // gidiyordu. En kritiği `brandColor`: hiçbir kontrolü yoktu ve değeri
  // karekod üreticisine ham olarak veriliyor (isletmeler/[id]/qr/page.tsx),
  // yani geçersiz bir renk o işletmenin QR sayfasını tamamen çökertiyordu.
  const adresSonuc = alanDogrula(formData.get("address"), "adres", "Adres", {
    zorunlu: false,
  });
  const renkSonuc = alanDogrula(formData.get("brandColor"), "renk", "Marka rengi", {
    zorunlu: false,
  });
  const linkSonuc = alanDogrula(formData.get("googleReviewUrl"), "webAdresi", "Google linki", {
    zorunlu: false,
  });
  const esikSonuc = sayiAlani(formData.get("notifyThreshold"), "Bildirim eşiği", {
    enAz: 1,
    enCok: 5,
    varsayilan: 3,
  });
  const ayarHatasi = ilkHata(adresSonuc, renkSonuc, linkSonuc, esikSonuc);
  if (ayarHatasi) return { error: ayarHatasi };

  const adres = (adresSonuc.ok && adresSonuc.deger) || null;
  const googleLinki = linkSonuc.ok ? linkSonuc.deger : "";
  // Boş bırakılırsa varsayılan marka rengi.
  const markaRengi = (renkSonuc.ok && renkSonuc.deger) || "#111827";
  const esik = esikSonuc.ok ? esikSonuc.deger : 3;

  if (!slugify(name)) {
    return { error: "İşletme adından geçerli bir adres üretilemedi." };
  }

  // Adres, karekodun içindeki yolun kendisi. Aynı adı iki kişi aynı anda
  // yazsa bile ikisi ayrı adres almalı; kararı veritabanına bırakıp
  // çakışınca yeniden deniyoruz (bkz. src/lib/slug.ts).
  const business = await slugIleOlustur(name, (slug) =>
    prisma.business.create({
      data: {
        accountId,
        slug,
        name,
        type,
        address: adres,
        googleReviewUrl: googleLinki || null,
        brandColor: markaRengi,
        notifyThreshold: esik,
        categories: {
          create: DEFAULT_CATEGORIES[type as BusinessType].map(
            (categoryName, index) => ({ name: categoryName, sortOrder: index }),
          ),
        },
        tables: {
          create: Array.from({ length: tableCount }, (_, index) => ({
            tableNumber: String(index + 1),
            qrToken: newQrToken(),
          })),
        },
      },
    }),
  );

  if (wantsManager) {
    await prisma.user.create({
      data: {
        accountId,
        name: managerName,
        username,
        email: managerEmail,
        phone,
        role: "manager",
        businessId: business.id,
        passwordHash: await hashPassword(managerPassword),
      },
    });
  }

  await denetimYaz(user, "business.create", {
    entity: "business",
    entityId: business.id,
    detail: `${business.name} açıldı`,
    accountId: business.accountId,
  });

  revalidatePath("/admin/isletmeler");
  revalidatePath("/admin/kullanicilar");
  redirect(`/admin/isletmeler/${business.id}`);
}

export async function updateBusiness(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireIsletmeYonetimi();
  const id = String(formData.get("id") ?? "");

  if (!await canAccessBusiness(user, id)) return { error: "Yetkiniz yok." };

  const adSonuc = alanDogrula(formData.get("name"), "isletmeAdi", "İşletme adı");
  const esikSonuc = sayiAlani(formData.get("notifyThreshold"), "Bildirim eşiği", {
    enAz: 1,
    enCok: 5,
    varsayilan: 3,
  });
  // brandColor'ın HİÇ doğrulaması yoktu ve değeri karekod üreticisine ham
  // gidiyor — geçersiz bir renk QR sayfasını çökertiyordu.
  const renkSonuc = alanDogrula(formData.get("brandColor"), "renk", "Marka rengi", {
    zorunlu: false,
  });
  const adresSonuc = alanDogrula(formData.get("address"), "adres", "Adres", {
    zorunlu: false,
  });
  // Wi-Fi sınırları uydurma değil: SSID standardı 32, WPA2 parolası 63
  // karakter. Daha uzunu hiçbir cihazda çalışmıyor, yani kaydetmenin de
  // anlamı yok.
  const wifiAdiSonuc = alanDogrula(formData.get("wifiSsid"), "wifiAdi", "Wi-Fi adı", {
    zorunlu: false,
  });
  const wifiSifreSonuc = alanDogrula(
    formData.get("wifiPassword"),
    "wifiSifresi",
    "Wi-Fi şifresi",
    { zorunlu: false },
  );
  const iysSonuc = alanDogrula(formData.get("iysBrandCode"), "iysKodu", "İYS marka kodu", {
    zorunlu: false,
  });

  const temelHata = ilkHata(
    adSonuc,
    esikSonuc,
    renkSonuc,
    adresSonuc,
    wifiAdiSonuc,
    wifiSifreSonuc,
    iysSonuc,
  );
  if (temelHata) return { error: temelHata };

  const name = adSonuc.ok ? adSonuc.deger : "";
  const threshold = esikSonuc.ok ? esikSonuc.deger : 3;
  const brandColor = (renkSonuc.ok && renkSonuc.deger) || "#111827";
  const address = (adresSonuc.ok && adresSonuc.deger) || null;
  const wifiSsid = (wifiAdiSonuc.ok && wifiAdiSonuc.deger) || null;
  const wifiPassword = (wifiSifreSonuc.ok && wifiSifreSonuc.deger) || null;
  const iysBrandCode = (iysSonuc.ok && iysSonuc.deger) || null;

  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "").trim();
  if (googleReviewUrl && !googleYorumLinkiGecerliMi(googleReviewUrl)) {
    return {
      error:
        "Google yorum linki çalışmıyor gibi görünüyor. Google Haritalar'da " +
        "işletmenizi açıp 'Paylaş' ile aldığınız adresi yapıştırın — " +
        "içinde DEGISTIRIN gibi bir yer tutucu kalmamalı.",
    };
  }
  // Bağlantı alanlarının hepsi TEK kural: `webAdresi`. Önceden aynı
  // `/^https?:\/\//i` kontrolü bu dosyada üç ayrı yerde tekrarlanıyordu ve
  // hiçbirinde uzunluk sınırı yoktu. `https?` şartı yalnızca biçim değil
  // güvenlik: şema serbest kalsaydı `javascript:` bir bağlantı olarak
  // sayfaya basılabilirdi.
  const linkAlanlari = [
    ["googleReviewUrl", "Google linki"],
    ["instagramUrl", "Instagram linki"],
    ["yemeksepetiUrl", "Yemeksepeti linki"],
    ["getirUrl", "Getir linki"],
    ["trendyolUrl", "Trendyol linki"],
    ["migrosUrl", "Migros linki"],
  ] as const;

  const linkler: Record<string, string | null> = {};
  for (const [alan, etiket] of linkAlanlari) {
    const sonuc = alanDogrula(formData.get(alan), "webAdresi", etiket, { zorunlu: false });
    if (!sonuc.ok) return { error: sonuc.hata };
    linkler[alan] = sonuc.deger || null;
  }
  const instagramUrl = linkler.instagramUrl;

  /**
   * Çalışma saatleri tek bir metin alanında geliyor (bkz.
   * CalismaSaatleri.tsx). Doğrulama ÇÖZÜP YENİDEN YAZMAK: çözücü bozuk
   * parçaları zaten atıyor, yazıcı da kanonik biçimi üretiyor. Böylece
   * veritabanına elle kurulmuş bir istekten gelen çöp giremiyor ve
   * biçim tek yerden (lib/isletme/calisma-saati.ts) belirleniyor.
   */
  const calismaSaatleri = saatleriYaz(
    saatleriCoz(String(formData.get("calismaSaatleri") ?? "")),
  );

  // Tür kümesi: enum'a bağlı. Boş gelirse "değiştirme" anlamına geliyor.
  const turHam = String(formData.get("type") ?? "");
  if (turHam && !(turHam in BUSINESS_TYPES)) {
    return { error: "Geçerli bir işletme türü seçin." };
  }
  const tur = turHam || null;

  // Karekod kartı yazısı ve duyuru: sessizce kesmek yerine sınırlı kırpma
  // (metinAlani varsayılanı) — bu iki alan serbest metin, yarım kalması
  // reddedilmesinden iyi.
  const qrYazi = metinAlani(formData.get("qrCardText"), "Karekod kartı yazısı", {
    enCok: 80,
  });
  const duyuruSonuc = metinAlani(formData.get("announcement"), "Duyuru", { enCok: 120 });
  const metinHatasi = ilkHata(qrYazi, duyuruSonuc);
  if (metinHatasi) return { error: metinHatasi };
  const duyuru = (duyuruSonuc.ok && duyuruSonuc.deger) || null;

  // Görseller data URI olarak gelir; boş dize "kaldır" demek. Sunucu boyut ve
  // biçimi yeniden doğrular — tarayıcının küçültmesine güvenmiyoruz.
  const rawLogo = String(formData.get("logoUrl") ?? "");
  const rawCover = String(formData.get("coverUrl") ?? "");

  const logoUrl = rawLogo ? rawLogo : null;
  const coverUrl = rawCover ? rawCover : null;

  if (logoUrl) {
    const problem = validateImageDataUrl(logoUrl, "logo");
    if (problem) return { error: `Logo: ${problem}` };
  }
  if (coverUrl) {
    const problem = validateImageDataUrl(coverUrl, "cover");
    if (problem) return { error: `Kapak: ${problem}` };
  }

  await prisma.business.update({
    where: { id },
    data: {
      name,
      // Tür değişimi sadece patronun yetkisinde; sorumlu formu göndermez.
      //
      // TÜR KÜMESİ BURADA DA DENETLENİYOR. Önceden yalnızca createBusiness'te
      // bakılıyordu, güncellemede `String(formData.get("type"))` doğrudan
      // yazılıyordu — yani formu elle kuran biri işletmeye tanınmayan bir
      // tür verebiliyordu. Sonuç sessiz değil: DEFAULT_CATEGORIES[type]
      // undefined dönüyor ve o tür üzerinden geçen kod patlıyor.
      ...(user.role === "owner" && tur ? { type: tur } : {}),
      address,
      googleReviewUrl: linkler.googleReviewUrl,
      brandColor,
      notifyThreshold: threshold,
      googleRedirect: formData.get("googleRedirect") === "on",
      qrCardText: (qrYazi.ok && qrYazi.deger) || null,
      // Menüde gizlemek yetmez: form alanı elle kurulabilir. Modül kapalı
      // bir hesapta bu alana ne gönderilirse gönderilsin dokunulmuyor —
      // var olan değer korunuyor, silinmiyor de.
      ...(user.moduller.includes("iys") ? { iysBrandCode } : {}),
      logoUrl,
      coverUrl,
      instagramUrl,
      wifiSsid,
      wifiPassword,
      calismaSaatleri,
      announcement: duyuru,
      announcementActive: formData.get("announcementActive") === "on",
      yemeksepetiUrl: linkler.yemeksepetiUrl,
      getirUrl: linkler.getirUrl,
      trendyolUrl: linkler.trendyolUrl,
      migrosUrl: linkler.migrosUrl,
    },
  });

  await denetimYaz(user, "business.update", {
    entity: "business",
    entityId: id,
    detail: `${name} ayarları güncellendi`,
  });

  revalidatePath(`/admin/isletmeler/${id}`);
  revalidatePath("/admin/isletmeler");
  return { saved: true };
}

export async function addCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireIsletmeYonetimi();
  const businessId = String(formData.get("businessId") ?? "");
  const adSonuc = alanDogrula(formData.get("name"), "kisaBaslik", "Kategori adı");

  if (!await canAccessBusiness(user, businessId)) return { error: "Yetkiniz yok." };
  if (!adSonuc.ok) return { error: adSonuc.hata };
  const name = adSonuc.deger;

  const existing = await prisma.categoryTemplate.findUnique({
    where: { businessId_name: { businessId, name } },
  });
  if (existing) {
    // Daha önce kapatılmış bir kategori tekrar açılabilir.
    await prisma.categoryTemplate.update({
      where: { id: existing.id },
      data: { active: true },
    });
  } else {
    const count = await prisma.categoryTemplate.count({ where: { businessId } });
    await prisma.categoryTemplate.create({
      data: { businessId, name, sortOrder: count },
    });
  }

  await denetimYaz(user, "business.category", {
    entity: "business",
    entityId: businessId,
    detail: `Kategori eklendi: ${name}`,
  });

  revalidatePath(`/admin/isletmeler/${businessId}`);
  return { saved: true };
}

/**
 * Kategoriye düşük puan verildiğinde sorulacak seçenekleri günceller.
 *
 * Boş bırakılırsa kategori adına göre akıllı varsayılana geri dönülür
 * (bkz. src/lib/anket-detay.ts) — "temizledim, artık hiç sorulmasın"
 * demek isteyen için ise seçenekleri tek tek silmek yerine kategoriyi
 * kapatmak doğru yol.
 */
export async function updateCategoryProblems(formData: FormData) {
  const user = await requireIsletmeYonetimi();
  const id = String(formData.get("categoryId") ?? "");

  const category = await prisma.categoryTemplate.findUnique({ where: { id } });
  if (!category || !(await canAccessBusiness(user, category.businessId))) return;

  const problemOptions = secenekleriBirlestir(
    secenekleriAyristir(String(formData.get("problemOptions") ?? "")),
  );

  await prisma.categoryTemplate.update({ where: { id }, data: { problemOptions } });
  await denetimYaz(user, "business.category", {
    entity: "business",
    entityId: category.businessId,
    detail: `${category.name} sorun seçenekleri güncellendi`,
  });

  revalidatePath(`/admin/isletmeler/${category.businessId}`);
  revalidatePath("/admin/profil");
}

export async function toggleCategory(formData: FormData) {
  const user = await requireIsletmeYonetimi();
  const id = String(formData.get("categoryId") ?? "");

  const category = await prisma.categoryTemplate.findUnique({ where: { id } });
  if (!category || !await canAccessBusiness(user, category.businessId)) return;

  await prisma.categoryTemplate.update({
    where: { id },
    data: { active: !category.active },
  });

  revalidatePath(`/admin/isletmeler/${category.businessId}`);
}

export async function moveCategory(formData: FormData) {
  const user = await requireIsletmeYonetimi();
  const id = String(formData.get("categoryId") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const category = await prisma.categoryTemplate.findUnique({ where: { id } });
  if (!category || !await canAccessBusiness(user, category.businessId)) return;

  const siblings = await prisma.categoryTemplate.findMany({
    where: { businessId: category.businessId },
    orderBy: { sortOrder: "asc" },
  });
  const index = siblings.findIndex((c) => c.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return;

  // Sıra numaralarını baştan yazmak, eşit sortOrder'ları da düzeltir.
  //
  // Tek transaction: yarıda kalan bir yeniden sıralama, iki kategoriye aynı
  // sortOrder'ı bırakıp listeyi kalıcı olarak karıştırırdı ve bunu ancak
  // müşteri anketi tuhaf sırada görünce fark ederdik. Ya hepsi ya hiçbiri.
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await prisma.$transaction(
    reordered.map((item, order) =>
      prisma.categoryTemplate.update({
        where: { id: item.id },
        data: { sortOrder: order },
      }),
    ),
  );

  revalidatePath(`/admin/isletmeler/${category.businessId}`);
}

export async function addTables(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireIsletmeYonetimi();
  const businessId = String(formData.get("businessId") ?? "");
  if (!await canAccessBusiness(user, businessId)) return { error: "Yetkiniz yok." };

  // Ham girdi BÖLÜNMEDEN önce sınırlanıyor. Aşağıdaki eleman sayısı
  // kontrolü doğru ama geç: 50 MB'lık bir dizeyi düzenli ifadeyle bölmek,
  // sonra "çok fazla eleman" demek işi zaten yapmış olmak demek.
  // 300 masa × 40 karakter + ayraçlar için 16 KB fazlasıyla yeterli.
  const hamSonuc = metinAlani(formData.get("tableNumbers"), "Masa numaraları", {
    enAz: 1,
    enCok: EN_COK_MASA * (EN_UZUN_MASA_ADI + 2),
    kirp: false,
  });
  if (!hamSonuc.ok) return { error: hamSonuc.hata };
  const raw = hamSonuc.deger;
  const isEntrance = formData.get("isEntrance") === "on";

  // Hem "1-20" aralığı hem "VIP-1, VIP-2" listesi kabul edilir.
  let numbers: string[];
  const range = raw.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start || end - start >= EN_COK_MASA) {
      return { error: `Aralık geçersiz veya çok geniş (en fazla ${EN_COK_MASA} masa).` };
    }
    numbers = Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
  } else {
    numbers = raw
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (numbers.length === 0) {
    return { error: 'Masa numarası girin (örn. "1-20" veya "VIP-1, VIP-2").' };
  }
  // Virgüllü liste dalında üst sınır YOKTU: on bin değer yapıştıran biri
  // tek istekte yirmi bin sorgu tetikleyebiliyordu. Aralık dalındaki 300
  // sınırı burada da geçerli.
  if (numbers.length > EN_COK_MASA) {
    return { error: `Tek seferde en fazla ${EN_COK_MASA} masa eklenebilir.` };
  }
  const gecersizAd = numbers.find((n) => n.length > EN_UZUN_MASA_ADI);
  if (gecersizAd) {
    return { error: `Masa adı en fazla ${EN_UZUN_MASA_ADI} karakter olabilir.` };
  }

  // Döngü içinde sorgu YOK: numaralar tek `findMany` ile okunuyor, yeni
  // olanlar tek `createMany` ile yazılıyor, kapalı olanlar tek
  // `updateMany` ile açılıyor. Önceden 300 masalık bir aralık 600 gidiş
  // dönüş demekti; uzak bir veritabanında (Neon) bu tek başına dakikalar
  // sürüyordu.
  const mevcutlar = await prisma.table.findMany({
    where: { businessId, tableNumber: { in: numbers } },
    select: { id: true, tableNumber: true, active: true },
  });
  const mevcutAdlar = new Set(mevcutlar.map((m) => m.tableNumber));
  const yenidenAcilacaklar = mevcutlar.filter((m) => !m.active).map((m) => m.id);
  const yeniler = numbers.filter((n) => !mevcutAdlar.has(n));

  if (yenidenAcilacaklar.length > 0) {
    await prisma.table.updateMany({
      where: { id: { in: yenidenAcilacaklar } },
      data: { active: true },
    });
  }
  if (yeniler.length > 0) {
    await prisma.table.createMany({
      data: yeniler.map((tableNumber) => ({
        businessId,
        tableNumber,
        isEntrance,
        qrToken: newQrToken(),
      })),
    });
  }
  const added = yeniler.length;

  await denetimYaz(user, "business.table", {
    entity: "business",
    entityId: businessId,
    detail: `${added} masa eklendi`,
  });

  revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
  return added > 0
    ? { saved: true }
    : { error: "Girilen masaların hepsi zaten tanımlı." };
}

/**
 * Masa kavramı olmayan işletmeler için tek ortak QR.
 *
 * Gece kulübü, büfe, kuaför gibi yerlerde "masa 7" diye bir şey yok; tek bir
 * kod basılıp kapıya/kasaya asılıyor. Bunu masa listesine "giriş" adında tek
 * bir kayıt olarak yazıyoruz — raporlar zaten masa alanı boş olan kayıtları
 * tolere ediyor, ayrı bir veri modeli gerekmiyor.
 */
export async function tekQrOlustur(formData: FormData): Promise<void> {
  const user = await requireIsletmeYonetimi();
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(user, businessId))) return;

  const mevcut = await prisma.table.findFirst({
    where: { businessId, isEntrance: true },
  });
  if (mevcut) {
    if (!mevcut.active) {
      await prisma.table.update({ where: { id: mevcut.id }, data: { active: true } });
    }
    revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
    return;
  }

  await prisma.table.create({
    data: {
      businessId,
      tableNumber: "giris",
      isEntrance: true,
      qrToken: newQrToken(),
    },
  });

  await denetimYaz(user, "business.table", {
    entity: "business",
    entityId: businessId,
    detail: "Tek ortak QR oluşturuldu",
  });

  revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
}

export async function toggleTable(formData: FormData) {
  const user = await requireIsletmeYonetimi();
  const id = String(formData.get("tableId") ?? "");

  const table = await prisma.table.findUnique({ where: { id } });
  if (!table || !await canAccessBusiness(user, table.businessId)) return;

  await prisma.table.update({ where: { id }, data: { active: !table.active } });
  await denetimYaz(user, "business.table", {
    entity: "table",
    entityId: id,
    detail: `Masa ${table.tableNumber} ${table.active ? "kapatıldı" : "açıldı"}`,
  });
  revalidatePath(`/admin/isletmeler/${table.businessId}`);
}

/**
 * Masaya özel QR'ların TAMAMINI tek seferde kapatır (girişteki tek ortak
 * QR hariç — o kendi düğmesinden ayrıca kapatılır).
 *
 * SİLMİYOR: `toggleTable` ile aynı mekanizma, `active: false`. Masalar
 * veritabanında duruyor; işletme fikrini değiştirirse "Aç" ile toplu geri
 * dönüş de mümkün olsun diye (bkz. tumMasalariAc).
 */
export async function tumMasalariKapat(formData: FormData): Promise<void> {
  const user = await requireIsletmeYonetimi();
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(user, businessId))) return;

  const sonuc = await prisma.table.updateMany({
    where: { businessId, isEntrance: false, active: true },
    data: { active: false },
  });

  await denetimYaz(user, "business.table", {
    entity: "business",
    entityId: businessId,
    detail: `${sonuc.count} masa QR'ı toplu kapatıldı`,
  });
  revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
  revalidatePath(`/admin/isletmeler/${businessId}/qr`);
}

/** Toplu kapatmanın tersi: kapalı masaya özel QR'ların hepsini açar. */
export async function tumMasalariAc(formData: FormData): Promise<void> {
  const user = await requireIsletmeYonetimi();
  const businessId = String(formData.get("businessId") ?? "");
  if (!(await canAccessBusiness(user, businessId))) return;

  const sonuc = await prisma.table.updateMany({
    where: { businessId, isEntrance: false, active: false },
    data: { active: true },
  });

  await denetimYaz(user, "business.table", {
    entity: "business",
    entityId: businessId,
    detail: `${sonuc.count} masa QR'ı toplu açıldı`,
  });
  revalidatePath(`/admin/isletmeler/${businessId}/masalar`);
  revalidatePath(`/admin/isletmeler/${businessId}/qr`);
}

/* ------------------------------------------------------------- çoklu şube */

/**
 * Bir işletmenin ayarlarını, aynı hesaptaki başka şubelere kopyalar.
 *
 * Kasıtlı olarak KOPYALANMAYAN alanlar: ad, adres ve Google yorum linki —
 * bunlar tanım gereği her şubeye özel (aynı isim/adres/link'i başka bir
 * şubeye yazmak o şubeyi bozar). Geri kalan her şey (marka rengi, QR kart
 * metni, Wi-Fi, paket sipariş linkleri, İYS marka kodu, logo/kapak, sosyal
 * medya, karşılama duyurusu) bir zincirin şubeler arası ortak tutmak
 * isteyebileceği "marka" ayarları — bu yüzden hepsi kopyalanıyor. Wi-Fi ve
 * sipariş platformu linkleri gerçekte şubeye göre değişebilir; formda ayrı
 * bir uyarı bunu belirtiyor ama işlemi engellemiyor, çünkü hangisinin
 * geçerli olduğunu yalnızca işletme sahibi bilir.
 */
export async function ayarlariKopyala(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireIsletmeYonetimi();
  const kaynakId = String(formData.get("businessId") ?? "");
  const hedefIdler = formData.getAll("hedefIds").map(String).filter(Boolean);

  if (!(await canAccessBusiness(user, kaynakId))) return { error: "Yetkiniz yok." };
  if (hedefIdler.length === 0) return { error: "En az bir işletme seçin." };

  const kaynak = await prisma.business.findUnique({
    where: { id: kaynakId },
    select: {
      type: true,
      brandColor: true,
      notifyThreshold: true,
      googleRedirect: true,
      qrCardText: true,
      iysBrandCode: true,
      logoUrl: true,
      coverUrl: true,
      instagramUrl: true,
      announcement: true,
      announcementActive: true,
      wifiSsid: true,
      wifiPassword: true,
      yemeksepetiUrl: true,
      getirUrl: true,
      trendyolUrl: true,
      migrosUrl: true,
    },
  });
  if (!kaynak) return { error: "Kaynak işletme bulunamadı." };

  const izinliIdler = new Set(await allowedBusinessIds(user));
  const hedefler = hedefIdler.filter((id) => id !== kaynakId && izinliIdler.has(id));
  if (hedefler.length === 0) return { error: "Geçerli bir hedef işletme seçilmedi." };

  await prisma.business.updateMany({
    where: { id: { in: hedefler } },
    data: kaynak,
  });

  const isimler = await prisma.business.findMany({
    where: { id: { in: hedefler } },
    select: { name: true },
  });

  await denetimYaz(user, "business.update", {
    entity: "business",
    entityId: kaynakId,
    detail: `Ayarlar kopyalandı → ${isimler.map((b) => b.name).join(", ")}`,
  });

  for (const id of hedefler) {
    revalidatePath(`/admin/isletmeler/${id}`);
  }
  revalidatePath("/admin/isletmeler");

  return { saved: true };
}
