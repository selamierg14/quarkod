/**
 * Biyerlere karanlık tema paleti.
 *
 * Saf siyah (#000) BİLEREK yok: OLED'de siyah, üstündeki koyu gri kartla
 * arasında "kenar" hissi bırakmıyor ve arayüz katmansız/ucuz görünüyor.
 * Bunun yerine çok koyu bir gece grisi zemin + iki kademe yükseltilmiş
 * yüzey kullanılıyor; derinlik kenarlık çizgisiyle değil, yüzeyin bir ton
 * açılmasıyla anlatılıyor (Material 3'ün "elevation tint" ilkesi).
 */

export const renkler = {
  /** Ana zemin — ekranın en alt katmanı. */
  zemin: "#121214",
  /** Kartlar, listeler, giriş alanları. */
  katman: "#1A1A1E",
  /** Basılı/aktif/öne çıkan yüzeyler — bir ton daha yakın. */
  katmanYuksek: "#252528",

  /**
   * Kenarlıklar yalnızca GEREKTİĞİNDE (cam yüzeyin sınırı, ayraç).
   * Kart çevresine çizgi çekmek yerine gölge tercih ediliyor.
   */
  cizgi: "rgba(255,255,255,0.06)",
  cizgiBelirgin: "rgba(255,255,255,0.12)",

  metin: {
    /** Başlıklar — kristal beyaz. */
    ana: "#FFFFFF",
    /** Gövde metni. */
    govde: "rgba(255,255,255,0.72)",
    /** İpucu, alt bilgi. Asla okunamayacak kadar silik değil. */
    soluk: "rgba(255,255,255,0.45)",
    /** Renkli zemin üstündeki metin. */
    ters: "#121214",
  },

  /**
   * Birincil aksiyon rengi — mevcut Biyerlere web kimliğinin indigo'su,
   * mobilde bir tık daha canlı/moru kuvvetli tonu.
   */
  vurgu: "#7C6BFF",
  vurguParlak: "#A395FF",
  vurguSoluk: "rgba(124,107,255,0.14)",

  /**
   * Oyunlaştırma rengi (puan, rozet, seviye). Aksiyon renginden AYRI:
   * "kazandın" ile "buraya bas" aynı renkte olursa ödül hissi kayboluyor.
   */
  odul: "#F5A524",
  odulParlak: "#FFC65C",
  odulSoluk: "rgba(245,165,36,0.14)",

  basari: "#10B981",
  uyari: "#FF6B4A",
  bilgi: "#38BDF8",

  /** Cam yüzeylerin altındaki yarı saydam katman. */
  cam: "rgba(26,26,30,0.72)",
  camKoyu: "rgba(18,18,20,0.82)",
} as const;

/** Mekan türüne göre pin/etiket rengi — haritayla listeler aynı dili konuşsun. */
export const turRenkleri: Record<string, string> = {
  yeme_icme: "#F5A524",
  balikci: "#38BDF8",
  gece_kulubu: "#A78BFA",
};

/** Mekan türüne göre simge. */
export const turSimgeleri: Record<string, string> = {
  yeme_icme: "☕",
  balikci: "🐟",
  gece_kulubu: "🍸",
};
