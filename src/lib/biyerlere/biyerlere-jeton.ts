/**
 * Biyerlere jetonunun tarayıcıda saklandığı anahtar.
 *
 * Tek bir sabitte tutuluyor çünkü İKİ bağımsız yer aynı anahtarı bilmek
 * zorunda: OturumSaglayici (jetonu yazan/okuyan taraf) ve masa anketi
 * (SurveyForm) — anketi dolduran kişi aynı tarayıcıda Biyerlere'ye de
 * girişliyse yorumunu "doğrulanmış" olarak bağlamak için jetonu buradan
 * okuyor. Adı iki yerde ayrı yazılsaydı biri değişip diğeri unutulduğunda
 * bağlantı sessizce kopardı.
 */
export const BIYERLERE_JETON_ANAHTARI = "biyerlere_jeton";
