# Müşteri Memnuniyet Anketi Sistemi

Üç işletme (KESKİNLEZZETLER, Ege Cunda Balık, Sahne Marin) için tek altyapı
üzerinde çalışan, masa QR'ı ile geri bildirim toplayan sistem.

- Müşteri masadaki QR'ı okutur → mobil web sayfası açılır → yıldız + işletmeye
  özel kategori puanları + serbest yorum.
- **5 yıldız** → teşekkür ekranı + o işletmenin Google yorum linkine yönlendirme.
- **4 ve altı** → dahili kayıt, Google'a gidilmez, ilgili sorumluya + patrona
  e-posta bildirimi.
- Patron üç işletmeyi tek panelden görür; işletme sorumlusu yalnızca kendisininkini.

## Kurulum

```bash
npm install
```

`.env` dosyası hazır gelir; en azından şu iki değeri değiştirin:

| Değişken | Açıklama |
| --- | --- |
| `AUTH_SECRET` | Oturum çerezini imzalar. En az 32 karakter, rastgele. |
| `NEXT_PUBLIC_APP_URL` | QR kodlarına gömülen taban adres. Baskıdan önce gerçek alan adı olmalı. |
| `SMTP_*` | E-posta bildirimi için. Boş bırakılırsa bildirimler konsola yazılır, sistem çalışmaya devam eder. |

Veritabanını kurun ve örnek veriyi yükleyin:

```bash
npm run setup
```

Geliştirme sunucusu:

```bash
npm run dev
```

## Örnek hesaplar

`npm run setup` şu hesapları oluşturur (şifre hepsinde `degistir123` — ilk işte
değiştirin):

| Rol | E-posta | Görebildiği |
| --- | --- | --- |
| Patron | `patron@ornek.com` | Üç işletme + kıyaslama + kullanıcı yönetimi |
| Sorumlu | `keskin@ornek.com` | KESKİNLEZZETLER |
| Sorumlu | `egecunda@ornek.com` | Ege Cunda Balık |
| Sorumlu | `sahnemarin@ornek.com` | Sahne Marin |

Kurulum şifresini kullanan hesaplar **Kullanıcılar** sayfasında sarı etiketle
işaretlenir. Herkes `/admin/sifre` üzerinden kendi şifresini değiştirebilir;
patron başkalarının şifresini sıfırlayabilir ve yeni kullanıcı ekleyebilir.

Panel: `/admin` · Anket örneği: `/f/keskinlezzetler/5`

## Ekranlar

| Yol | Ne yapar |
| --- | --- |
| `/f/{isletme}/{masa}` | Müşteri anketi (mobil öncelikli, tek elle doldurulur) |
| `/admin` | Özet: işletme başına ortalama, açık şikayet, en zayıf kategori |
| `/admin/geri-bildirimler` | Filtrelenebilir tablo (işletme, durum, puan, tarih, yorumda arama) |
| `/admin/geri-bildirimler/{id}` | Detay, durum geçişi (yeni/incelendi/çözüldü), iç not, bildirim geçmişi |
| `/admin/isletmeler` | İşletme listesi + yeni işletme/lokasyon ekleme (patron) |
| `/admin/isletmeler/{id}` | Ayarlar, kategori şablonu, masa/QR noktaları |
| `/admin/isletmeler/{id}/qr` | Toplu QR üretimi, PNG indirme, masa standı için yazdırma |
| `/admin/kiyaslama` | İşletmeler arası kıyaslama (yalnız patron) |
| `/admin/kirilim` | Vardiyaya ve masaya göre kırılım |
| `/admin/kullanicilar` | Kullanıcı ekleme, şifre sıfırlama, pasifleştirme (yalnız patron) |
| `/admin/sifre` | Kendi şifresini değiştirme (herkes) |

Geri bildirim listesindeki **CSV indir** düğmesi, ekranda uygulanan filtrenin
aynısıyla dosya üretir (Excel'in Türkçe karakterleri bozmaması için BOM'lu ve
noktalı virgülle ayrılmış).

## Kategori şablonları

Kategoriler koda gömülü değil, `category_templates` tablosunda tutulur ve
panelden düzenlenir (ekle / kapat / sırala). Yeni işletme açılırken türe göre
başlangıç seti otomatik gelir:

- **Yeme-içme:** yemek kalitesi, servis hızı, temizlik, fiyat/performans, personel ilgisi
- **Balıkçı:** balığın tazeliği, servis kalitesi, fiyat/performans, temizlik, mekan/manzara
- **Gece kulübü:** müzik/DJ, giriş/kapı süreci, içki servis hızı, atmosfer/dekor, güvenlik/personel

Kategori "kapatıldığında" silinmez — eski kayıtlardaki puanlar korunur.

## Bildirim eşiği

Her işletmenin kendi eşiği var (varsayılan: 3 ve altı). Eşik altında puan
geldiğinde o işletmenin sorumlusuna **ve** patrona e-posta gider. Gönderim
denemesi başarılı da olsa başarısız da olsa `notifications` tablosuna yazılır ve
geri bildirim detayında görünür.

SMTP tanımlı değilse bildirim konsola düşer ve kayıt "gönderilemedi" olarak
işaretlenir — anket akışı bundan etkilenmez.

## Ölçülen şeyler

| Metrik | Nasıl hesaplanır |
| --- | --- |
| **Google dönüşümü** | Butona *tıklayan* / butonu *gören* müşteri. "Gösterdik" değil "gitti" ölçülür. |
| **Anket tamamlama** | Anketi gönderen / QR okutup ekranı açan. Ölçümün başladığı tarihten öncesi sayılmaz. |
| **Ortalama çözüm süresi** | Şikayetin gelişinden ilk kez "çözüldü" işaretlenmesine kadar geçen süre. |
| **Vardiya kırılımı** | Her kayda otomatik yazılan sabah/akşam/gece etiketine göre. |
| **Masa kırılımı** | En düşük ortalamalı masa üstte; mekânla ilgili sorunları (gürültü, ısı, servise uzaklık) ele verir. |

Çözüm süresi yalnızca **ilk** çözülüşte yazılır — kayıt tekrar açılıp
kapatılırsa metrik bozulmaz.

## Giriş güvenliği

Aynı e-postaya 15 dakika içinde 5 başarısız deneme yapılırsa o hesap geçici
olarak kilitlenir; aynı IP'den 15 başarısız deneme olursa IP kilitlenir (çok
sayıda hesabı tarayan saldırı için). Başarılı girişten sonraki sayaç sıfırlanır,
böylece bir kez yanlış yazan kullanıcı ceza çekmez.

Hatalı girişte "e-posta mı şifre mi yanlış" bilgisi verilmez — aksi halde
saldırgan geçerli hesapların listesini çıkarabilir.

## Tekrar ve taşkın koruması

Kafede herkes aynı Wi-Fi IP'sini paylaştığı için tek başına IP engeli yanlış
sonuç verir — iki masadaki iki müşteri aynı IP'den gelir. Bu yüzden iki katman:

- **Tarayıcı çerezi + masa:** aynı tarayıcı, aynı masadan 30 dakika içinde ikinci
  kez gönderemez. Farklı masa serbesttir.
- **IP taşkını:** aynı IP'den aynı işletmeye 10 dakikada 5'ten fazla gönderim
  gelirse geçici olarak durdurulur.

Eşikler [actions.ts](src/app/f/%5Bslug%5D/%5Btable%5D/actions.ts) dosyasının
başındaki sabitlerden ayarlanır.

## KVKK

İletişim bilgisi yalnızca **açık rıza** ile saklanır. Anket ekranında müşteri
telefon mu e-posta mı bırakacağını seçer, altında tek cümlelik rıza metni ve
açılıp kapanan tam aydınlatma metni bulunur (veri sorumlusu, amaç, hukuki
dayanak, saklama süresi, haklar). Rıza verilmeden iletişim bilgisi kaydedilmez —
puan ve yorum yine kaydedilir.

Her kayıtta rızanın **ne zaman** ve **hangi metin sürümüne** verildiği saklanır;
geri bildirim detayında görünür. Metni değiştirdiğinizde
[kvkk.ts](src/lib/kvkk.ts) içindeki `KVKK_VERSION` değerini de artırın.

Saklama süresi 90 gün. Süresi dolanları silmek için günde bir kez çalıştırın:

```bash
npm run kvkk:temizle
```

Bu komut yalnızca iletişim bilgisini boşaltır, silme anını kayda yazar; puanlar
ve yorumlar istatistik için kalır. Sunucuda cron'a bağlamayı unutmayın —
çalıştırılmazsa müşteriye verilen 90 gün sözü yerine gelmez.

## Ölçüm

Panelde iki ayrı sayı var, karıştırmayın:

- **Google butonu gösterilen:** 5 yıldız verip yönlendirme ekranını gören müşteri.
- **Google dönüşümü:** o butona **gerçekten tıklayan** müşteri. Asıl anlamlı olan bu.

Tıklamadan sonrasını (Google'a yorum yazıp yazmadığını) ölçmek teknik olarak
mümkün değil — Google böyle bir veri vermiyor. Gerçek yorum sayısını Google
Business panelinden takip edip buradaki tıklama sayısıyla karşılaştırın.

Özet ekranındaki grafikler son 12 haftanın haftalık ortalamasını gösterir; veri
gelmeyen haftalar bilinçli olarak boş bırakılır (sıfır çizmek yanıltıcı bir düşüş
gösterirdi). Değişim rozeti son 30 günü önceki 30 günle karşılaştırır.

## QR kartı

Kartın üstündeki cümle, yazılımın tamamından daha çok etkiliyor okutulma oranını.
Her işletmenin türüne göre bir başlangıç metni geliyor ("Nasıl olduğunu
söyleyin — 30 saniye sürer" gibi), işletme ayarlarından değiştirilebilir.

İşe yarayan metnin üç özelliği var: **kısa**, **süre veren** ("30 saniye") ve
**karşılığı belli**. Bir ikram veya indirim vaat edebiliyorsanız okutulma oranı
belirgin şekilde artar — o zaman metni ona göre yazın ve vaadi tutun.

## Google yönlendirme politikası

Spesifikasyonda review-gating riski bilinerek kabul edilmişti. Bu yüzden
yönlendirme **işletme bazında kapatılabilir** hale getirildi: işletme ayarlarında
"5 yıldızda Google'a yönlendir" kapatılırsa herkes aynı nötr teşekkür ekranını
görür. Nötr varyanta geçmek kod değişikliği gerektirmez.

## Teknoloji

Next.js 16 (App Router, server actions) · Prisma 7 + SQLite · Tailwind CSS 4 ·
jose (JWT oturum) · nodemailer · qrcode.

Postgres'e geçiş: `prisma/schema.prisma` içinde `provider`'ı `postgresql` yapıp
`@prisma/adapter-pg` adaptörünü `src/lib/db.ts` içinde kullanmak yeterli;
sorgular değişmez.

## Yayına alırken — önce bunu okuyun

**SQLite tek bir dosyadır.** Vercel, Netlify gibi sunucusuz platformlarda dosya
sistemi kalıcı değildir: her dağıtımda veritabanı sıfırlanır ve tüm geri
bildirimler kaybolur, üstelik bunu fark etmeniz haftalar sürebilir. İki seçenek:

1. **Kalıcı diski olan bir sunucu** (VPS, Railway volume, Fly.io volume) — SQLite
   olduğu gibi kalır, `npm run yedekle` cron'a bağlanır.
2. **Postgres'e geçiş** — yukarıdaki iki satırlık değişiklik.

Hangisini seçerseniz seçin, `yedekler/` klasörünü makine dışına da senkronlayın.
Aynı diskte duran yedek, disk gittiğinde beraber gider.

### Canlıya geçiş kontrol listesi

- [ ] `npm run db:reset` — demo ve test kayıtlarını temizle
- [ ] Dört hesabın şifresini değiştir (Kullanıcılar sayfasındaki sarı uyarı kalkmalı)
- [ ] `.env` → `AUTH_SECRET` rastgele ve uzun
- [ ] `.env` → `NEXT_PUBLIC_APP_URL` gerçek alan adı (yoksa QR'lar localhost'u gösterir)
- [ ] `.env` → `SMTP_*` doldurulmuş, test bildirimi gitmiş
- [ ] Üç işletmenin gerçek Google yorum linkleri girilmiş
- [ ] Cron kurulmuş: yedekleme + KVKK temizleme + haftalık rapor
- [ ] QR'lar basılmış ve bir telefonla okutularak denenmiş

## Kapsamda olmayanlar

Spesifikasyona uygun olarak bu sürümde yok: çok dillilik (veri modeli buna kapalı
değil), acil durum/personel çağır butonu, Yemeksepeti/Trendyol yorumları, native
mobil uygulama.

Hâlâ eksik olanlar: fotoğraf yükleme, geri kazanma kuponları (tablo hazır,
arayüz yok), WhatsApp/Telegram bildirimi, aylık rapor (haftalık var), QR süre
aşımı (`qr_expires_at` alanı ve kontrolü hazır, süre atayan arayüz yok).

Vardiya etiketi her kayda otomatik yazılır (sabah/akşam/gece) ve detayda görünür;
vardiya bazlı raporlama henüz yok.

## Bakım komutları

| Komut | Ne yapar | Cron |
| --- | --- | --- |
| `npm run setup` | Şema + işletmeler + kullanıcılar (ilk kurulum) | — |
| `npm run yedekle` | Veritabanının tutarlı kopyasını `yedekler/` altına alır, son 14'ü tutar | **günlük** |
| `npm run kvkk:temizle` | Saklama süresi dolan iletişim bilgilerini siler | **günlük** |
| `npm run rapor:haftalik` | Haftalık özet e-postası (patrona konsolide, sorumlulara kendi işletmesi) | **haftalık** |
| `npm run demo:veri` | Paneli dolu görmek için 12 haftaya yayılmış örnek veri — **canlıda kullanmayın** | — |
| `npm run arama:backfill` | Eski yorumların arama alanını doldurur (bir kez yeterli) | — |
| `npm test` | Testleri çalıştırır | — |
| `npm run db:studio` | Veritabanını tarayıcıda incele | — |
| `npm run db:reset` | Her şeyi sil, baştan kur | — |

Yedekler proje içindeki `yedekler/` klasörüne düşer. **Bu klasörü makine dışına
da senkronlayın** — aynı diskte duran yedek, disk gittiğinde beraber gider.

## Testler

```bash
npm test
```

Sessizce bozulabilecek yerler test altında: Türkçe arama katlaması, yetki
filtresi (sorumlunun adres çubuğundan başka işletmeye geçememesi), KVKK
metinlerinin zorunlu başlıkları, vardiya hesabı ve CSV kaçışları.

Sunucu hataları [instrumentation.ts](src/instrumentation.ts) üzerinden aranabilir
tek satırlık kayda çevrilir; Sentry gibi bir servise bağlamak isterseniz çağrı
noktası orada hazır.

macOS/Linux'ta cron örneği:

```bash
crontab -e
```

```
0 4 * * *  cd /yol/cafe_projesi && npm run yedekle && npm run kvkk:temizle
0 8 * * 1  cd /yol/cafe_projesi && npm run rapor:haftalik
```

## Açık sorular (patron kararı bekliyor)

1. Üç işletmenin gerçek Google yorum linkleri — şu an hepsinde `DEGISTIRIN`
   içeren örnek link var, işletme ayarlarından değiştirilmeli.
2. Sahne Marin'de masa QR'ı mı kapı QR'ı mı? Şu an ikisi de tanımlı (bir "Giriş"
   QR'ı + 8 VIP masa); kullanılmayanı işletme sayfasından kapatabilirsiniz.
3. Bildirim eşiği üç işletmede de 3 olarak ayarlandı; her biri kendi sayfasından
   ayrı ayrı değiştirilebilir.
4. Bildirim kanalı şimdilik yalnızca e-posta.
5. KVKK saklama süresi 90 gün varsayıldı — işletmenin politikasına göre
   [kvkk.ts](src/lib/kvkk.ts) içindeki `CONTACT_RETENTION_DAYS` değiştirilebilir.
   Aydınlatma metnini bir hukukçuya okutmanızı öneririm; teknik altyapı hazır ama
   metnin içeriği hukuki sorumluluk taşır.
