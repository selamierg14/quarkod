# Müşteri Memnuniyet Anketi Sistemi

Üç işletme (KESKİNLEZZETLER, Ege Cunda Balık, Sahne Marin) için tek altyapı
üzerinde çalışan, masa QR'ı ile geri bildirim toplayan sistem.

- Müşteri masadaki QR'ı okutur → mobil web sayfası açılır → yıldız + işletmeye
  özel kategori puanları + serbest yorum.
- **5 yıldız** → teşekkür ekranı + o işletmenin Google yorum linkine yönlendirme.
- **4 ve altı** → dahili kayıt, Google'a gidilmez, ilgili sorumluya + patrona
  e-posta bildirimi.
- Patron üç işletmeyi tek panelden görür; işletme sorumlusu yalnızca kendisininkini.

## Giriş ve 2FA

Giriş **kullanıcı adıyla** yapılır (e-posta ile değil): personel değişiminde
e-posta değişse bile giriş bilgisi sabit kalsın diye. Kullanıcı adları
sistem genelinde tekildir; çakışma hem kayıttan önce hem veritabanı
seviyesinde engellenir (yarış durumunda da anlaşılır hata döner).

> **2FA şu an KAPALI.** `.env` içindeki `TWO_FACTOR_ENABLED="true"` ile açılır;
> kod silinmedi, yalnızca devre dışı. Test aşamasında `SMS_TEST_PHONE` dolu
> olduğu için tüm doğrulama kodları o numaraya gider — canlıya çıkarken bu
> satırı boşaltın ki kodlar kullanıcıların kendi telefonuna gitsin.

Akış tek ekranda üç adım:

1. Kullanıcı adı + şifre
2. Telefona gelen 6 haneli SMS kodu (2FA açıkken)
3. (Şifre sıfırlamada) yeni şifre

**Panelden şifre değiştirmek her hâlükârda SMS kodu ister** — 2FA kapalı olsa
bile. Açık bırakılmış bir oturumu ele geçiren kişinin şifreyi değiştirip hesabı
tamamen devralmasını engeller. Aynı sebeple patron **kendi** şifresini
Kullanıcılar ekranından değiştiremez; orası SMS adımını atlamanın kolay yoluydu.

## Oturumun geçerliliği

Oturum jetonu 12 saat yaşar, ama imzasının geçerli olması tek başına yetmez:
her istekte kullanıcının güncel hâline bakılır ([auth.ts](src/lib/auth.ts),
kural [session-token.ts](src/lib/session-token.ts) içinde saf bir fonksiyonda).
Aksi hâlde şu dördü 12 saat boyunca kâğıt üstünde kalırdı:

- pasifleştirilen kullanıcı panelde çalışmaya devam ederdi,
- askıya alınan hesabın kullanıcıları içeride kalırdı,
- rolü düşürülen kişi patron yetkisini korurdu,
- şifresini değiştiren kullanıcı, hesabını ele geçirmiş birinin açık
  oturumunu kapatamazdı.

Son madde için `users.passwordChangedAt` tutulur: bu andan önce üretilmiş her
jeton yanar. Kullanıcı kendi şifresini değiştirdiğinde kendi çerezi tazelenir,
yani dışarı atılan yalnızca **diğer** oturumlardır.

Aynı ekrandaki **"Şifremi unuttum"** bağlantısı da SMS koduyla yürür — kullanıcı
adı → kod → yeni şifre. Kullanıcı adının kayıtlı olup olmadığı sızdırılmaz;
her durumda aynı ekrana geçilir.

Güvenlik ayrıntıları:

- Kodlar veritabanında **hash'li** durur (şifre gibi). Veritabanını gören biri
  aktif kodu okuyup hesaba giremez.
- Kod 5 dakika geçerli, 5 yanlış denemede yakılır, 60 saniye içinde yeni kod
  istenemez (SMS bombardımanı olmasın).
- Adımlar arası "hangi kullanıcı doğrulandı" bilgisi imzalı kısa ömürlü bir
  çerezde taşınır — tarayıcıdan kullanıcı kimliği değiştirilip 2. adım
  başkasının hesabıyla tamamlanamaz.
- Telefonu olmayan kullanıcıda SMS gönderilemediği için 2FA uygulanmaz; yeni
  kullanıcı açarken telefon zorunludur.

SMS sağlayıcısı ayarları `.env` içindeki `SMS_*` alanlarındadır. Ayar yoksa kod
konsola düşer ve akış tıkanmaz (geliştirme kolaylığı).

## Çok kiracılı yapı

Sistem birden fazla müşteriye satılmak üzere kurulu. En üstte **hesap (kiracı)**
var; her işletme ve her kullanıcı bir hesaba bağlı.

| Rol | Görebildiği |
| --- | --- |
| `superadmin` | Platformu işleten taraf (siz). Hesapları açar, askıya alır ve **bir hesaba geçip o kiracının panelini birebir görebilir**. Hiçbir hesaba ait değildir. |
| `owner` | Kendi hesabındaki tüm işletmeler. Kendi kullanıcılarını ve işletmelerini yönetir. |
| `manager` | Yalnızca kendi işletmesi — aynı hesaptaki diğer işletmeyi bile göremez. |

İzolasyonun kuralları tek bir yerde: [tenancy.ts](src/lib/tenancy.ts). Panel
sayfaları bu kuralları doğrudan çağırır, kendi filtresini yazmaz.

İki tasarım kararı bilinçli:

- **Kapsam hesaplanamadığında boş filtre değil, eşleşmeyen bir kimlik döner.**
  Prisma'da boş `where` "hepsi" demektir; sızıntının en olası yolu budur.
- **Erişim kontrolü kimliğin tahmin edilemezliğine değil sahipliğe dayanır.**
  Adres çubuğuna başka bir kiracının işletme kimliği yazılırsa 404 döner.

**Hesaplar** ekranı hiyerarşik: her hesabın altında sahipleri, onun altında
işletmeleri ve her işletmenin sorumluları girintili olarak listelenir — kimin
kimin altında olduğu tek bakışta görünür.

Bir hesaba geçildiğinde üstte kalıcı bir bant çıkar ("X hesabını
görüntülüyorsunuz") ve tüm kapsam o hesaba daralır: açılan işletme ve kullanıcı
o hesaba yazılır. Bant, yanlışlıkla müşteri verisinde işlem yapmayı önler.

Askıya alınan hesabın kullanıcıları panele giremez ve QR'ları çalışmaz; verisi
silinmez, ödeme yapılınca kaldığı yerden devam eder.

İzolasyon [tenancy.test.ts](src/lib/tenancy.test.ts) içinde gerçek bir
veritabanına iki hesap kurularak sınanır. Buradaki bir kırmızı, doğrudan
"müşteri A, müşteri B'nin verisini görüyor" demektir.

## Kurulum

```bash
npm install
```

Ayarları kopyalayın ve doldurun:

```bash
cp .env.example .env
```

En azından şu değerler girilmeli:

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

## Yayına alma

Üretimde sunucu, ayarları kendisi denetler ve eksik varsa **açılmaz**
([uretim-kontrol.ts](src/lib/uretim-kontrol.ts)). Buradaki hataların hepsi
sistem çalışıyor görünürken sessizce zarar verdiği için uyarı yerine
durdurmayı seçtik:

| Kontrol | Sessizce ne olurdu |
| --- | --- |
| `AUTH_SECRET` en az 32 karakter | Anahtarı bulan kişi istediği kullanıcı adına oturum üretir |
| `NEXT_PUBLIC_APP_URL` gerçek ve `https` | localhost'la basılan QR'lar müşterinin telefonunda açılmaz; `secure` çerez http'de gitmez |
| `SMS_TEST_PHONE` boş | **Tüm** müşterilerin doğrulama kodu tek bir telefona düşer |
| 2FA açıksa `SMS_*` dolu | Kod gönderilemez, hiç kimse panele giremez |

QR kodları basılmadan önce `NEXT_PUBLIC_APP_URL` kesinleşmiş olmalı — adres
sonradan değişirse basılı bütün kartlar çöpe gider.

**Veritabanı.** SQLite tek dosyadır (`prisma/dev.db`); diskin kalıcı olduğu
bir sunucuda çalıştırın. Konteyner her dağıtımda sıfırlanan bir platformda
(dosya sistemi geçici olan kurulumlar) veri kaybolur — orada kalıcı disk
bağlayın ya da Postgres'e geçin. Prisma tarafında geçiş, `schema.prisma`
içindeki sağlayıcıyı ve adaptörü değiştirmekten ibaret; sorgular aynı kalır.

**Zamanlanmış işler.** Bunlar kendiliğinden çalışmaz, sunucuda cron'a
eklenmeli:

```bash
0 4 * * *  cd /uygulama/yolu && npm run yedekle
0 9 * * 1  cd /uygulama/yolu && npm run rapor:haftalik
0 3 * * 0  cd /uygulama/yolu && npm run kvkk:temizle
```

Sırasıyla: gecelik yedek, pazartesi sabahı haftalık rapor, KVKK saklama
süresi dolan iletişim bilgilerinin silinmesi.

## Örnek hesaplar

`npm run setup` şu hesapları oluşturur (şifre hepsinde `degistir123` — ilk işte
değiştirin):

| Rol | Kullanıcı adı | Görebildiği |
| --- | --- | --- |
| Platform | `platform` | Tüm hesaplar; hesap açma/askıya alma/geçiş |
| Patron | `patron` | Kendi hesabındaki üç işletme + kıyaslama + kullanıcılar |
| Sorumlu | `keskin` | KESKİNLEZZETLER |
| Sorumlu | `egecunda` | Ege Cunda Balık |
| Sorumlu | `sahnemarin` | Sahne Marin |

Giriş **kullanıcı adıyla** yapılır ve 2FA kodu örnek hesaplarda
`+90 536 490 10 01` numarasına gider.

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
| `/admin/profil` | Kendi bilgileri ve şifre değişimi; işletme sorumlusunda işletme ayarları da burada |

İşletme sorumlusu hiyerarşinin ucudur — altına başka kullanıcı ya da işletme
almaz ve tek bir işletmeye bakar. Bu yüzden ayrı bir "İşletmeler" listesi
görmez; işletmesinin ayarları, kategorileri ve masaları doğrudan Profil
sekmesindedir.

Geri bildirim listesindeki **CSV indir** düğmesi, ekranda uygulanan filtrenin
aynısıyla dosya üretir (Excel'in Türkçe karakterleri bozmaması için BOM'lu ve
noktalı virgülle ayrılmış).

`=`, `+`, `-` veya `@` ile başlayan hücrelerin başına tek tırnak konur. Yorumu
yazan müşteri, dosyayı açan ise işletme sahibidir; bu fark olmasa zararsız
görünen bir yorum Excel'de formül olarak çalışabilirdi.

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
geri bildirim detayında görünür.

**İYS kanıt kaydı.** Ticari ileti onayında mevzuat üç şey ister ve üçü de
saklanır ([schema](prisma/schema.prisma) → `MarketingConsent`):

- **Açık ileti metni** — hangi kanaldan (SMS / e-posta) ve hangi marka adına
  gönderileceği cümlede açıkça yazar. Metin müşterinin bıraktığı kanala göre
  değişir; telefon veren birine "e-posta da gönderilecek" demek, alınmamış bir
  onayı beyan etmek olurdu.
- **Aydınlatma metni** — onay kutusunun hemen yanında açılır bağlantı.
- **Log ve zaman damgası** — onay anı, **gerçek IP adresi** ve o an ekranda
  gösterilen metnin tam kopyası. Sürüm numarası tek başına yetmez: metin aynı
  sürümle değiştirilirse hangi cümlenin onaylandığı ispatlanamaz. Metni değiştirdiğinizde
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

## İşletme görselleri (logo / kapak)

Her işletme, anket ekranında görünecek bir **logo** ve isteğe bağlı bir **kapak
fotoğrafı** yükleyebilir (İşletme ayarları). Görsel yoksa marka rengiyle bir
degrade ve işletme adının baş harfi kullanılır — ekran her durumda dolu görünür.

Görseller **tarayıcıda küçültülüp** veritabanına data URI olarak yazılır: dış
depolama servisi (S3/R2) gerektirmez, her ortamda (VPS/serverless) çalışır. Logo
~400px kareye, kapak ~1200px genişliğe indirgenir; tipik boyut birkaç KB.
Yalnızca PNG/JPEG/WebP kabul edilir (SVG script taşıyabildiği için hariç),
sunucu boyutu ayrıca doğrular ([image.ts](src/lib/image.ts)).

Yüklenen görsel aynı zamanda **anket ekranının arka planını** kaplar: kapak
varsa o, yoksa logo. `object-cover` ile oranı korunur (gerilme/pikselleşme
olmaz), üstündeki beyaz perde ve hafif bulanıklıkla soluklaşır — marka hissi
verir ama metin okunur kalır.

İleride çok sayıda büyük görsel gerekirse geçiş yolu: alanlar zaten URL tutuyor,
data URI yerine bir nesne deposunun URL'sini yazmak yeterli.

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
