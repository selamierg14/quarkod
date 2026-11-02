/**
 * Bir geri bildirime müşteri yanıtı gönderilip gönderilemeyeceğinin kuralı.
 *
 * KVKK sınırı: müşteri "yalnızca bu geri bildirim hakkında bana dönülsün"
 * diye açık rıza verdiyse iletişim kurulabilir. Rıza yoksa, iletişim bilgisi
 * yoksa ya da saklama süresi dolup bilgi silindiyse yanıt kapalıdır. Kural
 * burada saf bir fonksiyonda; hem sunucu action'ı hem arayüz aynı kaynağı
 * kullanıyor, biri gevşerse diğeri de gevşemesin.
 */

export type YanitDurumu = {
  consentGiven: boolean;
  contactInfo: string | null;
  contactErasedAt: Date | null;
};

/** Yanıt gönderilebiliyorsa null, engelliyse Türkçe gerekçe. */
export function yanitEngeli(feedback: YanitDurumu): string | null {
  if (!feedback.consentGiven) {
    return "Müşteri iletişim için rıza vermemiş; yanıt gönderilemez.";
  }
  if (!feedback.contactInfo) {
    return "Müşteri iletişim bilgisi bırakmamış.";
  }
  if (feedback.contactErasedAt) {
    return "İletişim bilgisi saklama süresi dolduğu için silinmiş.";
  }
  return null;
}

/** Kısa yol: yanıt kutusu gösterilsin mi. */
export function yanitlanabilir(feedback: YanitDurumu): boolean {
  return yanitEngeli(feedback) === null;
}
