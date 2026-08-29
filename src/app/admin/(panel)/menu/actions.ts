"use server";

import { revalidatePath } from "next/cache";
import { allowedBusinessIds, canAccessBusiness, requireYazma } from "@/lib/auth";
import { denetimYaz } from "@/lib/denetim";
import { prisma } from "@/lib/db";
import { validateImageDataUrl } from "@/lib/image";
import {
  parseKalori,
  parsePrice,
  serializeAlerjenler,
  serializeOzelBilesenler,
  serializeTags,
} from "@/lib/menu";
import { uniqueConstraintMessage } from "@/lib/unique-error";
import { menuAcikMi } from "@/lib/menu-erisim";

export type MenuFormState = { error?: string; saved?: string };

/**
 * Menü işlemlerinde ortak kapı.
 *
 * İki şeyi birden doğrular: kullanıcı bu işletmeye erişebiliyor mu ve
 * hesabın menü modülü açık mı. İkincisi olmadan, modülü satın almamış bir
 * müşteri ekranı göremese de doğrudan action çağırarak menü kurabilirdi.
 */
async function menuIzni(businessId: string): Promise<string | null> {
  // Salt okunur kullanıcı buradan geçemez: requireYazma hata fırlatır.
  const user = await requireYazma();
  if (!businessId || !(await canAccessBusiness(user, businessId))) {
    return "Bu işletme için yetkiniz yok.";
  }
  if (!(await menuAcikMi(businessId))) {
    return "QR menü modülü bu hesapta açık değil.";
  }
  return null;
}

/** Menü değişikliklerini denetim kaydına yazar. */
async function menuDenetim(
  action: "menu.category" | "menu.item",
  detail: string,
  entityId?: string,
) {
  const user = await requireYazma();
  await denetimYaz(user, action, { detail, entity: action, entityId });
}

/**
 * Panel ekranlarını tazeler.
 *
 * Müşteri menüsü için ayrıca bir şey yapmaya gerek yok: içerik artık
 * önbelleğe alınmadan okunuyor (bkz. src/lib/menu-onbellek.ts). Burada
 * bir zamanlar `updateTag` çağrılıyordu ama o, `unstable_cache`
 * etiketlerini zaten düşürmüyordu — yani menü değişikliği müşteriye hiç
 * yansımıyordu.
 */
function yenile(businessId: string) {
  void businessId;
  revalidatePath("/admin/menu");
  revalidatePath("/admin/menu/onizle");
  revalidatePath("/admin/menu/sablonlar");
}

/** Menünün "fiyatlar en son ne zaman güncellendi" damgasını bugüne çeker. */
async function fiyatTarihiniDamgala(businessId: string) {
  await prisma.business.update({
    where: { id: businessId },
    data: { menuPriceUpdatedAt: new Date() },
  });
}

/* --------------------------------------------------------------- kategori */

export async function addMenuCategory(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const hata = await menuIzni(businessId);
  if (hata) return { error: hata };

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { error: "Bölüm adı gerekli." };

  const son = await prisma.menuCategory.findFirst({
    where: { businessId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    await prisma.menuCategory.create({
      data: { businessId, name, sortOrder: (son?.sortOrder ?? 0) + 10 },
    });
  } catch (error) {
    const mesaj = uniqueConstraintMessage(error);
    if (mesaj) return { error: `"${name}" bölümü zaten var.` };
    throw error;
  }

  await menuDenetim("menu.category", `Bölüm eklendi: ${name}`);
  yenile(businessId);
  return { saved: `${name} bölümü eklendi.` };
}

export async function renameMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori || !name) return;
  if (await menuIzni(kategori.businessId)) return;

  await prisma.menuCategory.update({ where: { id }, data: { name } }).catch(() => {});
  await menuDenetim("menu.category", `Bölüm adı: ${kategori.name} → ${name}`, id);
  yenile(kategori.businessId);
}

export async function toggleMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori) return;
  if (await menuIzni(kategori.businessId)) return;

  // Bölüm kapatılınca içindeki ürünler de menüde görünmez; kayıt silinmez,
  // mevsimlik bölümler (yaz menüsü) yıl boyunca saklanabilsin diye.
  await prisma.menuCategory.update({
    where: { id },
    data: { active: !kategori.active },
  });
  await menuDenetim(
    "menu.category",
    `Bölüm ${kategori.active ? "gizlendi" : "açıldı"}: ${kategori.name}`,
    id,
  );
  yenile(kategori.businessId);
}

/**
 * Bölümü kalıcı olarak siler (içindeki ürünlerle birlikte).
 *
 * "Gizle" farklı bir şey: menüde görünmesin ama kaydı dursun (mevsimlik
 * bölüm) diyorsanız o. Bu buton "artık hiç olmasın, tekrar boş menüye
 * dönüp şablon uygulayabileyim" dediğinizde. Ürün puanları (ItemRating)
 * etkilenmez — kayıtları kalır, yalnızca hangi üründen geldiği "menüden
 * kaldırılmış" olarak görünür.
 */
export async function deleteMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori) return;
  if (await menuIzni(kategori.businessId)) return;

  await prisma.menuCategory.delete({ where: { id } });
  await menuDenetim("menu.category", `Bölüm silindi: ${kategori.name}`, id);
  yenile(kategori.businessId);
}

export async function moveMenuCategory(formData: FormData) {
  const id = String(formData.get("categoryId") ?? "");
  const yon = String(formData.get("direction") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id } });
  if (!kategori) return;
  if (await menuIzni(kategori.businessId)) return;

  const komsu = await prisma.menuCategory.findFirst({
    where: {
      businessId: kategori.businessId,
      sortOrder: yon === "up" ? { lt: kategori.sortOrder } : { gt: kategori.sortOrder },
    },
    orderBy: { sortOrder: yon === "up" ? "desc" : "asc" },
  });
  if (!komsu) return;

  await prisma.$transaction([
    prisma.menuCategory.update({
      where: { id: kategori.id },
      data: { sortOrder: komsu.sortOrder },
    }),
    prisma.menuCategory.update({
      where: { id: komsu.id },
      data: { sortOrder: kategori.sortOrder },
    }),
  ]);
  yenile(kategori.businessId);
}

/* ------------------------------------------------------------------ ürün */

/** Form alanlarını okur; sorun varsa Türkçe mesaj döner. */
function urunAlanlari(formData: FormData):
  | { ok: true; veri: {
      name: string;
      description: string | null;
      priceKurus: number | null;
      imageUrl: string | null;
      tags: string | null;
      icindekiler: string | null;
      kaloriKcal: number | null;
      alerjenler: string | null;
      ozelBilesenler: string | null;
      bilgilerDogrulandi: boolean;
    } }
  | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { ok: false, error: "Ürün adı gerekli." };

  const description = String(formData.get("description") ?? "").trim().slice(0, 300);

  const priceKurus = parsePrice(String(formData.get("price") ?? ""));
  if (priceKurus === undefined) {
    return { ok: false, error: "Fiyat anlaşılmadı. Örnek: 149,90" };
  }

  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  if (imageUrl) {
    const gorselHatasi = validateImageDataUrl(imageUrl, "menu");
    if (gorselHatasi) return { ok: false, error: gorselHatasi };
  }

  // Zorunlu menü bilgileri. Boş bırakılabiliyor (bkz. şemadaki not), ama
  // GİRİLEN değer anlamlı olmalı: sessizce null'a düşürmek, işletmenin
  // girdiğini sandığı kaloriyi kaybetmek demekti.
  const icindekiler = String(formData.get("icindekiler") ?? "").trim().slice(0, 500);

  const kaloriKcal = parseKalori(String(formData.get("kaloriKcal") ?? ""));
  if (kaloriKcal === undefined) {
    return { ok: false, error: "Kalori anlaşılmadı. Porsiyon başına kcal girin, örnek: 320" };
  }

  return {
    ok: true,
    veri: {
      name,
      description: description || null,
      priceKurus,
      imageUrl: imageUrl || null,
      tags: serializeTags(formData.getAll("tags").map(String)),
      icindekiler: icindekiler || null,
      kaloriKcal,
      alerjenler: serializeAlerjenler(formData.getAll("alerjenler").map(String)),
      ozelBilesenler: serializeOzelBilesenler(
        formData.getAll("ozelBilesenler").map(String),
      ),
      // Formu kaydeden kişi zorunlu bilgileri ekranda gördü; şablondan
      // gelen tipik değerler artık "işletmenin beyanı" sayılıyor.
      bilgilerDogrulandi: true,
    },
  };
}

export async function addMenuItem(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const kategori = await prisma.menuCategory.findUnique({ where: { id: categoryId } });
  if (!kategori) return { error: "Bölüm bulunamadı." };

  const hata = await menuIzni(kategori.businessId);
  if (hata) return { error: hata };

  const alanlar = urunAlanlari(formData);
  if (!alanlar.ok) return { error: alanlar.error };

  const son = await prisma.menuItem.findFirst({
    where: { categoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const yeniUrun = await prisma.menuItem.create({
    data: {
      businessId: kategori.businessId,
      categoryId,
      sortOrder: (son?.sortOrder ?? 0) + 10,
      ...alanlar.veri,
    },
  });
  await menuDenetim("menu.item", `Ürün eklendi: ${yeniUrun.name}`, yeniUrun.id);

  // Fiyatlı bir ürün girildiyse menünün "fiyat güncelleme" tarihi ilerler.
  if (alanlar.veri.priceKurus !== null) {
    await fiyatTarihiniDamgala(kategori.businessId);
  }

  yenile(kategori.businessId);
  return { saved: `${alanlar.veri.name} eklendi.` };
}

export async function updateMenuItem(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return { error: "Ürün bulunamadı." };

  const hata = await menuIzni(urun.businessId);
  if (hata) return { error: hata };

  const alanlar = urunAlanlari(formData);
  if (!alanlar.ok) return { error: alanlar.error };

  await prisma.menuItem.update({ where: { id }, data: alanlar.veri });
  await menuDenetim("menu.item", `Ürün güncellendi: ${urun.name}`, id);

  // Yalnızca fiyat gerçekten değiştiyse damgalıyoruz: ürün adını düzeltmek
  // "fiyatlar güncellendi" bilgisini yanlış yere çekmesin.
  if (urun.priceKurus !== alanlar.veri.priceKurus) {
    await fiyatTarihiniDamgala(urun.businessId);
  }

  yenile(urun.businessId);
  return { saved: `${alanlar.veri.name} güncellendi.` };
}

/**
 * "Bugün tükendi" işareti.
 *
 * Menünün en sık değişen alanı bu ve mutfaktan gelen bilgiyle saniyeler
 * içinde işaretlenmesi gerekiyor; bu yüzden tek tıklık ayrı bir işlem.
 * Ürünü silmek yanlış olurdu: yarın geri gelecek ve geçmiş puanları ona bağlı.
 */
export async function toggleSoldOut(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  await prisma.menuItem.update({ where: { id }, data: { soldOut: !urun.soldOut } });
  await menuDenetim(
    "menu.item",
    `${urun.name}: ${urun.soldOut ? "tekrar var" : "bugün tükendi"}`,
    id,
  );
  yenile(urun.businessId);
}

export async function toggleMenuItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  await prisma.menuItem.update({ where: { id }, data: { active: !urun.active } });
  await menuDenetim(
    "menu.item",
    `Ürün ${urun.active ? "gizlendi" : "açıldı"}: ${urun.name}`,
    id,
  );
  yenile(urun.businessId);
}

/** Ürünü kalıcı olarak siler. Puan geçmişi kalır, ürün adı "kaldırılmış" görünür. */
export async function deleteMenuItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  await prisma.menuItem.delete({ where: { id } });
  await menuDenetim("menu.item", `Ürün silindi: ${urun.name}`, id);
  yenile(urun.businessId);
}

export async function moveMenuItem(formData: FormData) {
  const id = String(formData.get("itemId") ?? "");
  const yon = String(formData.get("direction") ?? "");
  const urun = await prisma.menuItem.findUnique({ where: { id } });
  if (!urun) return;
  if (await menuIzni(urun.businessId)) return;

  const komsu = await prisma.menuItem.findFirst({
    where: {
      categoryId: urun.categoryId,
      sortOrder: yon === "up" ? { lt: urun.sortOrder } : { gt: urun.sortOrder },
    },
    orderBy: { sortOrder: yon === "up" ? "desc" : "asc" },
  });
  if (!komsu) return;

  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: urun.id }, data: { sortOrder: komsu.sortOrder } }),
    prisma.menuItem.update({ where: { id: komsu.id }, data: { sortOrder: urun.sortOrder } }),
  ]);
  yenile(urun.businessId);
}

/* ---------------------------------------------------------------- şablon */

/**
 * Hazır bir menü şablonunu tek seferde işletmeye kurar.
 *
 * Yalnızca menü tamamen boşken çalışır: dolu bir menünün üstüne şablon
 * eklemek kategorileri karıştırır, "Kahveler" iki kez oluşabilir. Boş
 * menüde ilk kurulumu hızlandırmak için var — satış ziyaretinde boş bir
 * ekran göstermek yerine saniyeler içinde dolu, gerçekçi fiyatlı bir menü
 * gösterilebilsin diye.
 */
/**
 * Menünün tamamını siler — tüm bölümler ve içlerindeki ürünler.
 *
 * Yanlışlıkla basılmasın diye arayüzde iki adımlı onay var; sunucu tarafında
 * da ayrıca `onay` alanı bekleniyor ki tek bir POST'la kazara tetiklenmesin.
 * Ürün puanları (ItemRating) silinmez: menuItemId null'a düşer, ürün adı
 * kayıtta kaldığı için geçmiş raporlar anlamını korur.
 */
export async function tumMenuyuSil(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const hata = await menuIzni(businessId);
  if (hata) return { error: hata };

  if (String(formData.get("onay") ?? "") !== "evet") {
    return { error: "Silme onaylanmadı." };
  }

  const { count } = await prisma.menuCategory.deleteMany({ where: { businessId } });
  await menuDenetim("menu.category", `Tüm menü silindi (${count} bölüm)`);
  yenile(businessId);

  return { saved: `Menü tamamen silindi (${count} bölüm).` };
}

export async function sablonuUygula(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const sablonId = String(formData.get("sablonId") ?? "");

  const hata = await menuIzni(businessId);
  if (hata) return { error: hata };

  const { MENU_SABLONLARI } = await import("@/lib/menu-sablonlari");
  const { sablonUrunBilgisi } = await import("@/lib/menu-sablon-bilgileri");
  const sablon = MENU_SABLONLARI.find((s) => s.id === sablonId);
  if (!sablon) return { error: "Şablon bulunamadı." };

  const mevcutSayi = await prisma.menuCategory.count({ where: { businessId } });
  if (mevcutSayi > 0) {
    return { error: "Menüde zaten bölüm var; şablon yalnızca boş menüye uygulanabilir." };
  }

  await prisma.$transaction(
    sablon.kategoriler.map((kategori, kategoriIndex) =>
      prisma.menuCategory.create({
        data: {
          businessId,
          name: kategori.ad,
          sortOrder: (kategoriIndex + 1) * 10,
          items: {
            create: kategori.urunler.map((urun, urunIndex) => {
              // Zorunlu menü bilgileri için tipik bir başlangıç. Eşlemesi
              // olmayan ürün boş kalıyor — eksik bilgi, uydurulmuş
              // bilgiden iyidir (bkz. lib/menu-sablon-bilgileri.ts).
              const bilgi = sablonUrunBilgisi(urun.ad);
              return {
                businessId,
                name: urun.ad,
                description: urun.aciklama ?? null,
                priceKurus: urun.fiyatKurus ?? null,
                sortOrder: (urunIndex + 1) * 10,
                icindekiler: bilgi?.icindekiler ?? null,
                kaloriKcal: bilgi?.kaloriKcal ?? null,
                alerjenler: bilgi ? serializeAlerjenler(bilgi.alerjenler) : null,
                ozelBilesenler: bilgi
                  ? serializeOzelBilesenler(bilgi.ozelBilesenler ?? [])
                  : null,
                // İşletme bu değerleri henüz görmedi: kendi tarifiyle
                // örtüşmeyebilir, panelde doğrulaması isteniyor.
                bilgilerDogrulandi: false,
              };
            }),
          },
        },
      }),
    ),
  );

  await fiyatTarihiniDamgala(businessId);
  await menuDenetim("menu.category", `Şablon uygulandı: ${sablon.ad}`);
  yenile(businessId);

  return {
    saved:
      `"${sablon.ad}" şablonu uygulandı. Fiyatları ve zorunlu menü bilgilerini ` +
      `(içindekiler, kalori, alerjenler) kendi tarifinize göre doğrulayın.`,
  };
}

/* ------------------------------------------------------------- çoklu şube */

/**
 * Bir işletmenin menüsünü, aynı hesaptaki başka işletmelere kopyalar.
 *
 * Zincir/çok şubeli hesaplarda menüyü şube şube tek tek kurmak yerine bir
 * merkezden dağıtabilmek için var (bkz. sablonuUygula ile aynı gerekçe).
 * Bilerek yalnızca menüsü tamamen BOŞ olan hedeflere kopyalıyor: dolu bir
 * menünün üstüne kopyalamak "hiçbir veri silinmez" kuralıyla çelişir — o
 * şubenin kendi ürünlerini sessizce ezmek ya da yanına karıştırmak yerine,
 * önce oradan "Tüm menüyü sil" ile boşaltmasını istiyoruz.
 */
export async function menuyuKopyala(
  _prev: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const kaynakId = String(formData.get("businessId") ?? "");
  const hedefIdler = formData.getAll("hedefIds").map(String).filter(Boolean);

  const hata = await menuIzni(kaynakId);
  if (hata) return { error: hata };
  if (hedefIdler.length === 0) return { error: "En az bir işletme seçin." };

  const actor = await requireYazma();
  const izinliIdler = new Set(await allowedBusinessIds(actor));

  const kategoriler = await prisma.menuCategory.findMany({
    where: { businessId: kaynakId },
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (kategoriler.length === 0) {
    return { error: "Kopyalanacak menü boş." };
  }

  const kopyalanan: string[] = [];
  const atlanan: string[] = [];

  for (const hedefId of hedefIdler) {
    if (hedefId === kaynakId || !izinliIdler.has(hedefId)) continue;

    const [hedef, mevcutSayi] = await Promise.all([
      prisma.business.findUnique({ where: { id: hedefId }, select: { name: true } }),
      prisma.menuCategory.count({ where: { businessId: hedefId } }),
    ]);
    if (!hedef) continue;
    if (mevcutSayi > 0) {
      atlanan.push(hedef.name);
      continue;
    }

    await prisma.$transaction(
      kategoriler.map((kategori) =>
        prisma.menuCategory.create({
          data: {
            businessId: hedefId,
            name: kategori.name,
            sortOrder: kategori.sortOrder,
            active: kategori.active,
            items: {
              create: kategori.items.map((urun) => ({
                businessId: hedefId,
                name: urun.name,
                description: urun.description,
                priceKurus: urun.priceKurus,
                imageUrl: urun.imageUrl,
                tags: urun.tags,
                sortOrder: urun.sortOrder,
                active: urun.active,
              })),
            },
          },
        }),
      ),
    );
    await fiyatTarihiniDamgala(hedefId);
    kopyalanan.push(hedef.name);
  }

  if (kopyalanan.length > 0) {
    await menuDenetim(
      "menu.category",
      `Menü kopyalandı → ${kopyalanan.join(", ")}`,
    );
  }
  yenile(kaynakId);

  if (kopyalanan.length === 0) {
    return {
      error:
        atlanan.length > 0
          ? `Seçilenlerin menüsü zaten dolu, kopyalanmadı: ${atlanan.join(", ")}.`
          : "Hiçbir işletmeye kopyalanmadı.",
    };
  }

  const uyari = atlanan.length > 0 ? ` (zaten dolu olduğu için atlandı: ${atlanan.join(", ")})` : "";
  return { saved: `Menü şu işletmelere kopyalandı: ${kopyalanan.join(", ")}${uyari}` };
}
