import type { Role } from "./session-token";

/**
 * Satılabilir modüller ve kimin kime hangi modülü verebileceği.
 *
 * Kural tek cümle: **kimse sahip olmadığı modülü başkasına veremez.**
 * Zinciri platform yöneticisi başlatır — hesap sahibine (patron) ne verirse,
 * patron ekibine en fazla onu dağıtabilir. Böylece bir müşteri kendi
 * hesabında satın almadığı bir modülü açamıyor ve bunu tek bir yerde,
 * veriyle koruyoruz; her ekranda ayrı ayrı hatırlanması gereken bir kural
 * olmaktan çıkıyor.
 */
export const MODULLER = {
  anket: "QR değerlendirme",
  menu: "QR menü",
  iys: "İYS hizmeti",
  pazarlama: "Pazarlama izinleri",
  personel: "Personel operasyonu",
  kesfet: "Biyerlere keşfet",
} as const;

export type ModulAnahtari = keyof typeof MODULLER;

export const MODUL_ANAHTARLARI = Object.keys(MODULLER) as ModulAnahtari[];

/** Her modülün ne işe yaradığı — izin ekranındaki açıklama. */
export const MODUL_ACIKLAMALARI: Record<ModulAnahtari, string> = {
  anket: "Geri bildirim listesi, raporlar ve ürün puanları.",
  menu: "QR menü düzenleme, şablonlar ve duyurular.",
  iys: "Ticari ileti izinlerinin İYS'ye bildirilmesi.",
  pazarlama: "Pazarlama izni listesi ve dışa aktarım.",
  personel: "Vardiya çizelgesi, izinler ve görev şablonları.",
  kesfet:
    "İşletme, Biyerlere mobil uygulamasında haritada ve keşfet akışında görünür.",
};

export function gecerliModulMu(deger: string): deger is ModulAnahtari {
  return (MODUL_ANAHTARLARI as string[]).includes(deger);
}

/**
 * Bir kullanıcının etkin modül kümesi.
 *
 * Platform yöneticisi listeye bakılmaksızın hepsine erişir: hesapları o
 * kuruyor, kendi kendini kilitleyebilmesi anlamsız olurdu.
 */
export function etkinModuller(role: Role, moduller: string[]): Set<ModulAnahtari> {
  if (role === "superadmin") return new Set(MODUL_ANAHTARLARI);
  return new Set(moduller.filter(gecerliModulMu));
}

export function modulVarMi(
  role: Role,
  moduller: string[],
  modul: ModulAnahtari,
): boolean {
  return etkinModuller(role, moduller).has(modul);
}

/**
 * İzin verme ekranını kimler görebilir?
 *
 * Yalnızca platform yöneticisi ve hesap sahibi. Bölge müdürü ya da işletme
 * sorumlusu kendi altına kullanıcı açabiliyor ama modül dağıtamıyor:
 * modül dağıtımı ticari bir karar (neyin satın alındığı), operasyonel bir
 * karar değil. Aksi halde bir sorumlu, patronun kapattığı bir modülü
 * kendi ekibine açabilirdi.
 */
export function modulDagitabilirMi(role: Role): boolean {
  return role === "superadmin" || role === "owner";
}

/**
 * `actor`ın `hedef` role verebileceği modüller.
 *
 * Dönen liste her zaman actor'ın kendi kümesinin bir alt kümesi — çağıran
 * tarafın ayrıca kesişim alması gerekmiyor.
 */
export function verilebilirModuller(
  actorRole: Role,
  actorModuller: string[],
): ModulAnahtari[] {
  if (!modulDagitabilirMi(actorRole)) return [];
  const kendi = etkinModuller(actorRole, actorModuller);
  return MODUL_ANAHTARLARI.filter((m) => kendi.has(m));
}

/**
 * Formdan gelen modül listesini güvenli hale getirir.
 *
 * İki süzgeç: tanınmayan anahtarlar atılır ve actor'ın kendi sahip
 * olmadıkları düşülür. İkincisi asıl güvenlik kapısı — form alanı
 * gizlense bile istek elle kurulabilir.
 */
export function istenenModulleriSuz(
  actorRole: Role,
  actorModuller: string[],
  istenen: string[],
): ModulAnahtari[] {
  const izinli = new Set(verilebilirModuller(actorRole, actorModuller));
  return [...new Set(istenen.filter(gecerliModulMu))].filter((m) => izinli.has(m));
}
