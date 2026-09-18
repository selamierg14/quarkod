# Mimari — ne nerede

Projede iki ürün var, tek Next.js uygulaması servis ediyor:

- **Quarkod paneli** — işletmenin yönetim arayüzü (`/admin/*`)
- **Biyerlere** — tüketici tarafı; web sayfaları (`/kesfet`, `/harita`…) ve
  mobil uygulamanın çağırdığı JSON API'si (`/api/app/*`)

---

## Route'lar nerede?

Next.js App Router'da route ayrı bir dosyada listelenmez; **klasör yolu = URL**
ve o klasördeki dosyanın adı türünü belirler:

| Dosya | Anlamı |
|---|---|
| `page.tsx` | Tarayıcıda açılan sayfa |
| `route.ts` | JSON API ucu (GET/POST/DELETE dışa aktarılır) |
| `layout.tsx` | Alt ağacı saran kabuk |
| `actions.ts` | Server Action'lar — formların gittiği yer |
| `(parantez)` | URL'e girmeyen gruplama klasörü |
| `[koseli]` | Dinamik parça (`[slug]` → `/mekan/ada-kahvesi`) |

```
src/app/
├── admin/
│   ├── giris/              → /admin/giris        (panel girişi)
│   └── (panel)/            → /admin/*            (korumalı panel, 24 bölüm)
│       ├── kullanicilar/       page.tsx + actions.ts
│       ├── rezervasyon/        page.tsx + actions.ts
│       └── …
├── (biyerlere)/
│   ├── (auth)/giris|kayit  → /giris, /kayit      (tüketici)
│   └── (app)/              → /kesfet, /harita, /cuzdan, /profil, /mekan/[slug]
├── f/[slug]/[table]/       → /f/kafe/3           (masadaki QR sayfası)
└── api/
    ├── app/…               → /api/app/*          (mobil + tüketici API'si)
    ├── cron/…              → zamanlanmış işler   (CRON_SECRET ile korumalı)
    └── kupon-dogrula/      → kasada kupon yakma
```

> **`/api/app/*` uçlarının tam listesi tek dosyada:**
> [`src/lib/kimlik/api-politika.ts`](src/lib/kimlik/api-politika.ts).
> Hangi uç var, hangi HTTP metodunu kabul ediyor ve kimlik istiyor mu —
> hepsi orada. Tabloya yazılmayan bir uç 404 döner ve test kırılır.

---

## İstek hangi kapılardan geçiyor?

```
İstek
  │
  ├─ 1. middleware.ts            ← route ÇALIŞMADAN önce
  │     ├─ HTTPS zorlaması (HTTPS_ZORUNLU=1 iken 308 yönlendirme)
  │     ├─ /admin/*    → imzalı oturum çerezi yoksa /admin/giris
  │     └─ /api/app/*  → api-politika.ts: bilinmeyen uç 404,
  │                       yanlış metot 405, jetonsuz istek 401
  │
  ├─ 2. Sayfa / route içi kapılar
  │     ├─ Panel:    requireUser → requireYazma → requireModul → canAccessBusiness
  │     └─ Tüketici: appKullaniciGerekli (jeton imzası + kullanıcının güncel hâli)
  │
  ├─ 3. Hız sınırı               ← lib/kimlik/hiz-siniri.ts
  ├─ 4. Girdi doğrulama          ← lib/cekirdek/desenler.ts + girdi.ts
  └─ 5. İş kuralı (saf fonksiyon) → Prisma
```

Bunun ÖNÜNDE bir kapı daha var ve sunucuda değil, tarayıcıda:

```
0. Tarayıcı doğrulaması  ← alanOzellikleri() → <input maxLength pattern required>
```

Geçersiz istek formdan hiç çıkmıyor. Ama bu bir güvenlik sınırı DEĞİL —
nitelikler silinebilir, istek doğrudan da atılabilir. Kazanç, kullanıcının
sayfa gidip gelmeden geri bildirim alması ve sunucunun boşuna
çalışmaması.

Middleware Edge'de koştuğu için veritabanına erişemez; oradaki kontrol
**kaba ve ucuz** (jeton var mı), asıl doğrulama route içinde yapılır. İki
katman birbirinin yerine geçmez, üst üste biner.

> **Panelin kapı örtüsü test ediliyor.** `/admin/*` için middleware yalnızca
> "imzalı çerez var mı" diye bakar — yani panele girebilen HERKES oradan
> geçer. Rol, kiracı ve abonelik kararı route'un kendi kapısında verilir ve
> kapısı unutulmuş tek bir eylem, panele girebilen herkese açık demektir.
> [`panel-kapilari.test.ts`](src/lib/kimlik/panel-kapilari.test.ts) diskteki
> HER Server Action'ın ve HER sayfanın bir kapıya ulaştığını doğruluyor;
> muafiyet listesi iki satır (giriş ve çıkış), her biri gerekçeli.

---

## `src/lib` — iş mantığı, alanlara ayrılmış

Eskiden 90 dosya tek düz klasördeydi. Artık **"bu dosyayı hangi soruyu
cevaplamak için açarım"** ölçütüyle gruplu (teknik tür değil, iş alanı):

| Klasör | Ne var | Örnek |
|---|---|---|
| `cekirdek/` | Her yerden kullanılan temel taşlar | `db`, `ortam`, `girdi`, `desenler`, `constants`, `gun`, `slug` |
| `kimlik/` | Kim neye nasıl erişir | `auth`, `tenancy`, `session-token`, `app-oturum`, `moduller`, `panel`, `hiz-siniri`, `api-politika`, `yol-koruma` |
| `isletme/` | Kiracının işletmesi ve müşteri deneyimi | `menu*`, `anket*`, `masa`, `qr*`, `rezervasyon`, `duyuru`, `iys`, `kvkk` |
| `personel/` | Vardiya ve ekip | `vardiya`, `vardiya-degisim`, `vardiya-tablo` |
| `biyerlere/` | B2C tarafı | `kesfet*`, `mekan`, `rozet*`, `sadakat`, `ziyaret`, `davet`, `kupon-kod` |
| `rapor/` | Ölçüm ve çıktı | `stats`, `huni`, `haftalik-rapor`, `denetim`, `pdf` |
| `altyapi/` | Dış dünyaya açılan kanallar | `mail`, `sms`, `push`, `bildirim`, `cron`, `isler` |

**Kural:** bu dosyalar mümkün olduğunca **saf** — Next'ten ve veritabanından
bağımsız, testlenebilir. Route'lar ve Server Action'lar bunları çağıran ince
kabuklar. 941 testin büyük kısmı veritabanına hiç dokunmadan iş kurallarını
sınıyor.

---

## Girdi doğrulama: alan biçimlerinin tek kaynağı

[`src/lib/cekirdek/desenler.ts`](src/lib/cekirdek/desenler.ts) her alan
türünün biçimini bir kez tanımlıyor; **iki taraf da oradan okuyor**:

| | Çağrı | Ne yapıyor |
|---|---|---|
| Arayüz | `alanOzellikleri("eposta")` | `<input>` üzerine `maxLength`/`pattern`/`inputMode` serpiyor |
| Sunucu | `alanDogrula(ham, "eposta", "E-posta")` | Aynı desenle doğruluyor |

İkisi aynı kayıttan beslendiği için **ayrışamıyorlar** — önceki hâlde aynı
e-posta deseni beş ayrı dosyada elle yazılıydı ve hiçbirinde uzunluk sınırı
yoktu. `desenler.test.ts` ayrışmayı iki yönden de sınıyor ve elle yazılmış
kopyaların geri gelmesini engelliyor.

İki kural okurken şaşırtıyor, ikisi de bilinçli:

- **`girisKimligi` / `girisSifresi`**, açılış kurallarından (`kullaniciAdi`,
  `sifre`) daha gevşek. Giriş ekranı kaydedilmiş olabilecek her değeri kabul
  etmeli; bugünün kuralını orada dayatmak dünün kuralıyla açılmış hesapları
  kilitler. Girişte tek sınır uzunluk — o da bcrypt maliyeti yüzünden.
- **`renk`** alanına arayüz tarafında desen KONMUYOR: `type="color"` girdisi
  `pattern`'ı yok sayıyor ve geçersiz değeri sessizce `#000000` yapıyor.
  İşlevsiz bir nitelik bırakmak, alanın korunduğu izlenimi verdiği için
  olmamasından kötü.

## Kimlik: iki ayrı dünya

| | Panel | Tüketici |
|---|---|---|
| Taşıyıcı | httpOnly çerez | `Authorization: Bearer` |
| Üretim | `lib/kimlik/session-token.ts` | `lib/kimlik/app-oturum.ts` |
| Kapı | `lib/kimlik/auth.ts` | `lib/kimlik/app-api.ts` |
| Ömür | 12 saat | 30 gün |
| Ayrım | `role` iddiası | `aud: "biyerlere-app"` |

Aynı `AUTH_SECRET` kullanılıyor ama **audience** iddiası iki dünyayı ayırıyor:
tüketici jetonuyla panele, panel jetonuyla tüketici uçlarına girilemiyor.

Her istekte jeton imzasının yanı sıra kullanıcının **güncel hâli** de
veritabanından teyit ediliyor: askıya alınan hesap, rolü düşürülen kullanıcı
ve şifresini değiştiren kişinin eski oturumu anında düşüyor.

---

## Sosyal giriş (Apple / Google)

Tüketici tarafında kullanıcı adı + şifrenin yanında ikinci bir giriş yolu
var: [`lib/kimlik/sosyal-giris.ts`](src/lib/kimlik/sosyal-giris.ts).

Kural tek cümle: **istemcinin gönderdiği hiçbir iddiaya inanılmıyor.**
Uygulama yalnızca sağlayıcının imzaladığı kimlik jetonunu taşıyor; kimin
kim olduğuna sunucu, jetonu Apple/Google'ın kendi JWKS'iyle doğrulayarak
karar veriyor. Üç iddia ayrı ayrı kontrol ediliyor: imza, `iss` ve `aud`.
`aud` olmadan, başka bir uygulama için alınmış geçerli bir jetonla buradan
giriş yapılabilirdi.

| | Değer |
|---|---|
| Hesap bağı | `AppUser.googleSub` / `appleSub` (tekil) |
| E-postayla eşleştirme | **YOK** — adres değişebilir, Apple gizli adres verir, doğrulanmamış adresle eşleştirme devralma yoludur |
| Yapılandırma | `APPLE_ISTEMCI_IDLERI` / `GOOGLE_ISTEMCI_IDLERI` (virgüllü `aud` listesi) |
| Boşsa | Yöntem tamamen kapalı: uç 401, uygulamada düğme çıkmıyor |

**Şifresiz hesap sorunu ve çözümü.** Sosyal girişle açılan hesabın sahibi
bir şifre bilmiyor (`AppUser.sifreBelirlendi = false`). "Mevcut şifreni
gir" diyen üç işlem — şifre belirleme, kurtarma numarası, hesap silme —
onun için kilitli kalırdı; şifre kontrolünü atlamak ise çalınmış bir
oturuma hesabı silme yetkisi vermek olurdu. Bu yüzden kanıt, şifre yerine
**sağlayıcıdan alınan taze bir kimlik jetonu** ve jetonun `sub`u o hesaba
bağlı olmak zorunda. Tek kapı:
[`kimlikKanitiDogrula`](src/lib/kimlik/app-api.ts).

## Uygulamadan masa rezervasyonu

Panelin rezervasyon modülü (kat planı, çakışma, durumlar) baştan beri
vardı; tüketici tarafı
[`lib/biyerlere/rezervasyon-talebi.ts`](src/lib/biyerlere/rezervasyon-talebi.ts)
ile bağlandı. Kullanıcı masa SEÇMİYOR: kişi/gün/saat veriyor, gruba yetecek
en küçük boş masayı sunucu buluyor. Talep `bekliyor` durumunda açılıyor —
otomatik onay, mekanın haberi olmadan masasının satılması demek olurdu.

Eşzamanlılık: müsaitlik kontrolü ile yazma arasında başka bir talep aynı
masayı alabilir. Hız sınırındaki kalıbın aynısı uygulanıyor — kayıt önce
yazılıyor, sonra kendisi hariç çakışma aranıyor, varsa geri alınıyor.

## İki aşamalı doğrulama (SMS OTP)

Kod üretimi ve doğrulaması [`lib/kimlik/otp.ts`](src/lib/kimlik/otp.ts)'te,
**karar mantığı** ise ayrı bir dosyada:
[`lib/kimlik/iki-asamali.ts`](src/lib/kimlik/iki-asamali.ts). Ayrım bilinçli —
`otp.ts` `server-only` taşıyor (bcrypt + Prisma), oysa kural saf ve hem bakım
betiklerinin hem testlerin ona erişmesi gerekiyor.

İki **isimli soru** var ve hangisinin sorulduğu akışa göre değişiyor:

| Fonksiyon | Sorusu | Kim soruyor |
|---|---|---|
| `otpTelefonu(phone)` | "Bu numaraya kod gönderebilir miyiz?" | Şifre akışları |
| `ikiAsamaliDurum(phone)` | "Girişte kod adımından geçmeli mi?" | Giriş |

Fark bayrakta: `TWO_FACTOR_ENABLED`, **yalnızca girişi** etkiliyor. Şifre
değiştirme ve sıfırlama bayraktan bağımsız olarak her zaman SMS istiyor —
bayrak "her girişte kod sorulsun mu" sorusunun cevabı, "şifre değiştirmek
kimlik kanıtı ister mi" sorusunun değil. İkincisinin cevabı her zaman evet:
açık bırakılmış bir oturumu ele geçiren kişi hesabı tek tıkla devralmasın diye.

**Kapı kapalı devre.** Önceki hâli `!twoFactorEnabled() || !user.phone` idi
ve ikinci koşul sessiz bir kapıydı: bayrak açıkken bile telefonu olmayan
kullanıcı SMS adımını görmeden giriyordu. Bu istisna değil kuraldı —
kullanıcıların çoğunun telefonu kayıtlı değildi. Artık kod gönderilemeyen
hiçbir hesap giriş yapamıyor; "telefon yok" ve "numara bozuk" ayrı mesajlar
veriyor çünkü çözümleri ayrı.

> **Bayrağı açmadan önce:** `npm run 2fa:hazirlik` — kimlerin giremeyeceğini
> önceden söyler. `--onar` yalnızca demo hesaplarını düzeltir; gerçek bir
> kullanıcıya betikle telefon yazmaz, çünkü o numara kimlik kanıtı olacak ve
> doğru sahibine ait olduğunu ancak panelden giren bir yönetici teyit edebilir.

### Yedek numaralar

Kod varsayılan olarak **birincil** numaraya (`User.phone`) gidiyor. Kullanıcı
o numaraya ulaşamıyorsa giriş ekranındaki kod adımından kayıtlı başka bir
numarasına isteyebiliyor — yedekler ayrı tabloda (`UserPhone`), kurallar
[`lib/kimlik/telefonlar.ts`](src/lib/kimlik/telefonlar.ts)'te.

| Kural | Değer |
|---|---|
| En fazla yedek | 4 |
| Yedek ekleyemeyen rol | `garson` |

`garson` dışarıda çünkü o hesap en dar yetkili ve en çok el değiştiren tür;
her yedek numara hesaba erişecek bir kanal daha demek ve personel
değiştiğinde geride kalan numara sessiz bir açık kapıya dönüşür.

İki ayrıntı kolay gözden kaçıyor, ikisi de bilinçli:

- **Ham numara istemciye hiç inmiyor.** Giriş ekranı yalnızca maskeli hâli ve
  bir sıra numarası taşıyor; hedefi sunucu kendi listesinden çözüyor. Aksi
  halde bu uç, şifresi bilinen bir hesabın tüm numaralarını sızdırırdı.
- **Bekleme süresi numara BAŞINA.** Aynı numaraya art arda kod istemek SMS
  bombardımanı, başka numaraya istemek ise yedeklerin var oluş sebebi. Tek
  bir bekleme süresi ikisini ayıramadığı için özellik tam ihtiyaç anında
  çalışmıyordu; `OtpCode.phone` bu ayrımı mümkün kılıyor.

Sağlayıcı ekomesaj; istek gövdesi
[`lib/altyapi/sms.ts`](src/lib/altyapi/sms.ts)'te. İki tuzağı var:
`SMS_SENDER` sağlayıcıda **kayıtlı gönderici başlığı**dır (API kullanıcı adı
değil), ve `SMS_TEST_PHONE` doluyken **herkesin kodu tek numaraya gider** —
üretimde boş olmalı, yoksa iki aşamalı doğrulama anlamını yitirir.

## Sırlar ve yapılandırma

Tek kapı: [`src/lib/cekirdek/ortam.ts`](src/lib/cekirdek/ortam.ts).

- Tanınan değişkenler sabit bir kayıtta (`ORTAM`) — yanlış yazılan anahtar
  derleme zamanında yakalanır.
- `gizliAnahtar("AUTH_SECRET")` doğrulamayı tek yerde yapar; önceden bu
  kontrol beş dosyada kopyalanmıştı ve kopyalar ayrışmıştı.
- Hata mesajları değeri **asla** içermez.
- `.env` git'e girmez (`.gitignore`), `.env.example` şablondur.

---

## Kiracı izolasyonu

Kurallar [`src/lib/kimlik/tenancy.ts`](src/lib/kimlik/tenancy.ts) içinde,
veritabanından bağımsız ve testli. Temel ilke: kapsam hesaplanamadığında
filtre **boş bırakılmaz**, eşleşmeyen bir kimlik (`IMPOSSIBLE_ID`) konur —
Prisma'da boş `where` "hepsi" demektir ve sızıntının en olası yolu budur.

| Rol | Gördüğü işletmeler | Yönetebildiği kullanıcılar |
|---|---|---|
| `superadmin` | hepsi | hepsi |
| `owner` | kendi hesabı | bolge / manager / garson |
| `bolge` | atanmış işletmeler | yalnızca o işletmelerin garsonları |
| `manager` | tek işletme | o işletmenin garsonları |
| `garson` | tek işletme | yok |

Kullanıcı üzerinde işlem yapmak iki bağımsız kapıdan geçer: **kapsam**
(hangi kiracının kullanıcısı) ve **kıdem** (`yonetebilirMi` — açabildiğin
rolü yönetebilirsin).
