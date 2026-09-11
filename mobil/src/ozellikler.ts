/**
 * Uygulamada açık/kapalı özellikler.
 *
 * `KUPON_AKTIF`, sunucudaki `src/lib/biyerlere/kupon.ts` ile AYNI değeri
 * taşımak zorunda. İki yerde durmasının sebebi teknik: sekme çubuğu
 * derleme zamanında kuruluyor, yani "Cüzdan sekmesi olsun mu" sorusu
 * sunucudan veri gelmeden önce cevaplanmak zorunda.
 *
 * Ekranların İÇİ bu sabite bakmıyor; sunucudan gelen verinin varlığına
 * bakıyor (ör. `sadakat` alanı yoksa damga kartı çizilmiyor). Böylece
 * özellik sunucudan geri açıldığında yayındaki sürümler de içerik
 * göstermeye başlıyor — yalnızca sekme yeni bir sürüm gerektiriyor.
 */
export const KUPON_AKTIF = false;
