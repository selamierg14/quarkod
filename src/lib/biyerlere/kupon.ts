/**
 * KUPON VE SADAKAT ÖZELLİĞİNİN AÇMA/KAPAMA ANAHTARI.
 *
 * Şu an KAPALI. Gerekçe teknik değil operasyonel: kuponu kasada yönetmek
 * (müşterinin kodu göstermesi, personelin panelden yakması, süresi dolanın
 * takibi) işletme tarafında karşılığı olmayan bir yük çıkarıyordu.
 *
 * NEDEN KOD SİLİNMEDİ. Özellik ileride geri gelebilir. İki alternatif de
 * daha kötüydü:
 *
 *   - Kodu YORUM SATIRINA almak: 45 dosyaya yayılmış yorumlu bloklar
 *     zamanla çürür, kullanılmayan içe aktarımlar lint'e takılır, testlerin
 *     de kapatılması gerekir ve dosyaları okumak zorlaşır. En kötüsü,
 *     yorumdaki kod DERLENMEDİĞİ için çevresi değiştikçe sessizce
 *     geçersizleşir; geri açıldığında artık çalışmaz.
 *   - Kodu SİLMEK: ağaç temiz olurdu ama geri getirmek, aradan geçen
 *     değişikliklerle birlikte elle birleştirme işine dönüşürdü.
 *
 * Bayrak ikisinin de sorununu çözüyor: kod yerinde duruyor, DERLENİYOR,
 * testleri koşuyor — yani çevresi değiştikçe birlikte güncelleniyor. Geri
 * açmak bu dosyadaki tek satırı değiştirmek.
 *
 * SADAKAT DA BU BAYRAĞA BAĞLI. Damga kartının tek amacı eşiğe gelince kupon
 * üretmekti; ödülü kaldırıp damgayı bırakmak, kullanıcıya karşılığı olmayan
 * bir ilerleme çubuğu göstermek olurdu. İkisi birlikte gidiyor, birlikte
 * geri gelecekler.
 *
 * NE KAPANMIYOR: ziyaret kaydının kendisi, puanlar ve rozetler. Onlar
 * kupondan bağımsız çalışıyor ve ziyaret alışkanlığının ölçümü bozulmasın
 * diye açık kalıyor.
 *
 * MOBİLDE BİR EŞİ VAR: `mobil/src/ozellikler.ts`. İkisi aynı değeri taşımak
 * zorunda ve bu bilinçli bir ödün — sekme çubuğu derleme zamanında
 * kurulduğu için "Cüzdan sekmesi olsun mu" sorusu sunucudan veri gelmeden
 * cevaplanmak zorunda.
 *
 * Kopyanın zararı sınırlı tutuldu: mobil EKRANLARIN İÇİ bayrağa değil,
 * sunucudan gelen verinin varlığına bakıyor (ör. `sadakat` alanı yoksa
 * damga kartı çizilmiyor). Yani buradaki bayrak açıldığında yayındaki
 * mobil sürümler de içerik göstermeye başlıyor; yalnızca sekmenin geri
 * gelmesi yeni bir sürüm istiyor.
 */
export const KUPON_AKTIF = false;
