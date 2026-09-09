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
