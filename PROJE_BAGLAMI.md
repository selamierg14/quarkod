# PROJE BAĞLAMI — Quarkod + Biyerlere

> Bu belge, projeyi hiç görmemiş bir yapay zekâ asistanının (veya geliştiricinin) tek okumada
> tam bağlamı kavraması için hazırlandı. Kodla çelişen bir şey görürsen **kod doğrudur**;
> bu belge 2026-09-17 tarihli durumu anlatır (dal: `guvenlik-ve-yapi`, son commit `ec04a51`).

---

## 0. Asistan için çalışma kuralları (önce bunu oku)

1. **Dil:** Kullanıcıyla Türkçe konuş. Kod tanımlayıcıları, yorumlar, commit mesajları ve tüm arayüz metinleri **Türkçe** (`hizSiniriUygula`, `appKullaniciGerekli`, `Mekan`, `Rozet`…). Yeni kod da bu üslupta yazılmalı; yorum yoğunluğu yüksek ve "neden"i anlatan cinsten.
2. **Next.js 16.3.4 eğitim verindekinden farklı.** Kod yazmadan önce `node_modules/next/dist/docs/` altındaki ilgili kılavuzu oku (AGENTS.md kuralı).
3. **Kullanıcının kesin güvenlik şartları (pazarlıksız):**
   - "DB credential bilgileri git'e gitmeyecek." `.env*` git dışı; sadece `.env.example` depoda.
   - "HTTP istek karşılamamamız gerekiyor, HTTPS olması gerek." SSL henüz alınmadı; alınınca `HTTPS_ZORUNLU=1` açılacak (middleware 308 yönlendirir, HSTS başlığı eklenir).
   - "Asla ve asla veri sızıntısı ve backend hataları istemiyorum." → Hata mesajları iç ayrıntı sızdırmaz, varlık kâhini (kullanıcı adı/numara var mı) bırakılmaz, 500 yerine anlamlı 4xx döner.
4. **Geliştirme ve üretim AYNI Neon Postgres'i kullanıyor.** Yerel betik/test yazan her şey canlı veriye yazar. Test verisi oluşturduysan sonunda temizle.
5. Değişiklikten sonra doğrulama seti: `npx tsc --noEmit`, `npm run lint`, `npm test` (web ~1082 test), `cd mobil && npx vitest run` (46 test), `npm run build`, `npm run guvenlik:tara`.
6. Commit/push yalnızca kullanıcı isteyince. Commit biçimi: `feat(alan): …`, `fix(güvenlik): …` — Türkçe, neden odaklı.

---

## 1. Ürün nedir?

İki ürün, tek Next.js monolit, tek Postgres:

| | **Quarkod** (B2B) | **Biyerlere** (B2C) |
|---|---|---|
| Kime | Kafe/restoran/gece kulübü işletmeleri | Son kullanıcı (müşteri) |
| Ne | Çok kiracılı SaaS yönetim paneli: QR anket, QR menü, rezervasyon, vardiya, İYS/KVKK, raporlar | Mekan keşfi, harita, doğrulanmış masa ziyareti, rozet/puan, rotalar, buluşmalar |
| Nerede | `/admin/*` (web) | Web: `src/app/(biyerlere)` · Mobil: `mobil/` (Expo) · API: `/api/app/*` |
| Kimlik | httpOnly çerez, 12 saat | `Authorization: Bearer`, 30 gün |

**Bağlantı noktası:** Quarkod'da `kesfet` modülü açık olan işletme Biyerlere'de görünür. Masadaki QR (`/f/{slug}/{masa}`) hem anket/menü açar hem de mobil uygulamada okutulunca **GPS doğrulamalı ziyaret** üretir.

Pilot/demo işletmeler: KESKİNLEZZETLER, Ege Cunda Balık, Sahne Marin.

---

## 2. Teknoloji yığını

**Web/Sunucu (kök dizin)**
- Next.js **16.3.4** App Router, React **19.2**, Tailwind **v4**, TypeScript
- Prisma **7.10** + `@prisma/adapter-pg`, Postgres (Neon; `DATABASE_URL` pooler, `DIRECT_URL` migration)
- `jose` (JWT HS256), `bcryptjs`, `web-push`, `nodemailer`, `qrcode`, `leaflet`
- Vitest 4 testleri; Vercel'e dağıtım hedefli (`vercel.json` cron'ları)

**Mobil (`mobil/`)**
- Expo SDK **57**, React Native **0.86**, expo-router, zustand, AsyncStorage, expo-secure-store
- expo-camera (QR), expo-location, expo-notifications, react-native-webview (Leaflet harita), reanimated
- EAS profilleri: `development` / `preview` / `production` (`APP_ORTAMI=gelistirme|onizleme|yayin`)
- `app.config.ts`, `app.json`'ı genişletir; `APP_ORTAMI=yayin` iken `EXPO_PUBLIC_API_URL` https değilse derleme hata verir.

---

## 3. Dizin haritası

```
/
├── AGENTS.md / CLAUDE.md        → "Bu bildiğin Next.js değil" uyarısı
├── MIMARI.md                    → Mimari belge (istek kapıları, kimlik, 2FA, kiracılık) — ayrıntı için oku
├── README.md                    → Panel ürün belgesi (anket, menü, abonelik, KVKK, kurulum)
├── BIYERLERE_QUARKOD_MASTER_DOCUMENT.md / BIYERLERE_MOCKUP_SPEC.md → İlk ürün şartnamesi (kısmen eskidi)
├── prisma/schema.prisma         → 45 model, 34+ migration
├── next.config.ts               → Güvenlik başlıkları
├── vercel.json                  → Cron: kvkk-temizle (her gün 04:00), haftalik-rapor (Pzt 06:00)
├── scripts/                     → demo verisi, yedek, kvkk, şifre sıfırlama, 2fa hazırlık (tsx)
├── src/
│   ├── middleware.ts            → HTTPS, /admin çerez kapısı, /api/app politika kapısı
│   ├── instrumentation.ts       → Sunucu hatalarını tek satır kayda çevirir (Sentry bağlanacak yer)
│   ├── app/
│   │   ├── page.tsx + _landing/ → Quarkod tanıtım sitesi
│   │   ├── deneme/              → Deneme hesabı başvurusu
│   │   ├── admin/giris          → Panel girişi (+SMS 2FA, şifremi unuttum)
│   │   ├── admin/(panel)/       → Panel bölümleri (aşağıda)
│   │   ├── f/[slug]/[table]/    → Masa QR: karşılama, menu, anket, duyurular
│   │   ├── g/…                  → Paylaşılabilir genel sayfalar (işletme/duyuru/ürün)
│   │   ├── (biyerlere)/(auth)/  → /giris, /kayit, /sifremi-unuttum
│   │   ├── (biyerlere)/(app)/   → /kesfet, /harita, /ara, /mekan/[slug], /rotalar(/[slug]),
│   │   │                          /etkinlikler, /bildirimler, /cuzdan, /profil, /profil/sifre
│   │   ├── .well-known/         → apple-app-site-association, assetlinks.json (env yoksa 404)
│   │   └── api/
│   │       ├── app/*            → Tüketici JSON API'si (mobil + web)
│   │       ├── cron/*           → CRON_SECRET ile korumalı
│   │       ├── kupon-dogrula/   → Kasada kupon (şu an kapalı özellik)
│   │       └── health/
│   └── lib/                     → İş mantığı, ALANA göre gruplu, mümkün olduğunca SAF + testli
│       ├── cekirdek/  db, ortam, desenler (alan doğrulama tek kaynağı), girdi, gun, slug, uretim-kontrol
│       ├── kimlik/    auth, session-token, app-oturum, app-api, api-politika, hiz-siniri, login-guard,
│       │              istemci-ip, jeton-kurallari, jeton-iptal, sifre, sifre-bileti, otp, iki-asamali,
│       │              tenancy, moduller, panel, telefonlar, yol-koruma, impersonation
│       ├── isletme/   menu*, anket*, masa, qr*, rezervasyon, calisma-saati, duyuru, iys, kvkk, abonelik, google-yorum
│       ├── personel/  vardiya, vardiya-degisim, vardiya-tablo, vardiya-uyari
│       ├── biyerlere/ kesfet*, mekan, ziyaret, rozet*, sadakat, kupon*, davet, sponsorluk, biyerlere-plus,
│       │              etkinlik, rota-*, app-otp, app-push, biyerlere-istatistik
│       ├── rapor/     denetim, huni, haftalik-rapor
│       └── altyapi/   sms (ekomesaj), mail, push, bildirim, cron, isler
└── mobil/
    ├── app/
    │   ├── (sekmeler)/  kesfet, harita, rotalar, cuzdan (KUPON_AKTIF=false → gizli), profil
    │   ├── mekan/[slug], tara (QR), giris, kayit, sifremi-unuttum, guvenlik,
    │   │   bildirimler, etkinlikler, etkinlik-ac, +not-found, index
    └── src/
        ├── api/        istemci.ts (fetch sarmalayıcı), useVeri (önbellek+çevrimdışı), onbellek.ts (7 gün), tipler
        ├── store/      oturum, favoriler, bildirimler, bildirim-sayaci (zustand)
        ├── push/       bildirim.ts, konum.ts, yonlendirme.ts (+ .web.ts no-op)
        ├── ozellikler/ kesfet, harita, mekan, tara (qrCoz, ziyaretAkisi), cuzdan, profil, etkinlik
        ├── bilesenler/ Form, onay (web confirm / native Alert), AcikRozeti, Iskelet, Konfeti…
        ├── tasarim/    renkler, tipografi, olculer
        └── ozellikler.ts → KUPON_AKTIF = false (sunucudaki ile aynı olmak ZORUNDA)
```

---

## 4. Quarkod paneli

### Roller (`ROLLER` in `session-token.ts`)
| Rol | Gördüğü işletmeler | Yönetebildiği kullanıcılar |
|---|---|---|
| `superadmin` | hepsi (platform işletmecisi; hesaba "geçiş" yapabilir, üstte bant çıkar) | hepsi |
| `owner` (patron) | kendi hesabı | bolge / manager / garson |
| `bolge` | atanmış işletmeler (`user_businesses`) | o işletmelerin garsonları |
| `manager` | tek işletme | o işletmenin garsonları |
| `garson` | tek işletme | yok (yedek telefon da ekleyemez) |

**Kiracı izolasyonu** `lib/kimlik/tenancy.ts`: kapsam hesaplanamazsa boş `where` DEĞİL, `IMPOSSIBLE_ID` konur. Başka kiracının kimliği → 404.

### Modüller (`lib/kimlik/moduller.ts`) — hesap bazında satılır
`anket` (QR değerlendirme), `menu` (QR menü), `iys`, `pazarlama`, `personel` (vardiya), `kesfet` (Biyerlere'de görünme), `rezervasyon`.
Kural: **kimse sahip olmadığı modülü başkasına veremez.** Modül dağıtımı sadece superadmin/owner.

### Panel bölümleri (`/admin/…`)
Özet · geri-bildirimler (liste/detay/CSV) · kirilim (vardiya & masa) · urunler · menu (düzenle/şablonlar/önizle) · duyurular · isletmeler (ayarlar, masalar, QR basımı, çalışma saatleri) · kullanicilar · rezervasyon (masa durumu, kat planı) · vardiya-planlama · vardiyalarim · gorevlerim · izinler · entegrasyonlar · kiyaslama · denetim · profil · sifre · biyerlere (istatistik + kullanıcı buluşmalarını moderasyon) · **superadmin'e özel:** hesaplar, abonelikler, rotalar, sponsorlar (sponsor/push kredisi), plus, sistem (cron sağlığı).

### Panel kapıları
`requireUser → requireYazma → requireModul → canAccessBusiness`. `panel-kapilari.test.ts` diskteki HER Server Action ve sayfanın bir kapıya ulaştığını yapısal olarak doğrular (muafiyet: giriş, çıkış).

### Önemli panel davranışları
- Giriş **kullanıcı adıyla**. `TWO_FACTOR_ENABLED=true` iken SMS OTP adımı; telefon yoksa giriş YOK (sessiz atlama kapatıldı). Yedek numaralar `UserPhone` (en fazla 4).
- Panel şifre değişimi her zaman SMS ister.
- 5 yıldız → Google yorum yönlendirmesi (işletme kapatabilir); ≤ eşik → sorumluya e-posta.
- Abonelik bitişi (`accounts.expiresAt`) → panel ve QR'lar kapanır, veri silinmez; son 14 günde uyarı bandı.
- Fiyatlar kuruş (tam sayı). Ürün puanında ad kopyalanır (`ItemRating.itemName`).
- Denetim kaydı (`AuditLog`) her değişiklikte.
- KVKK: iletişim bilgisi 90 gün sonra temizlenir (cron), İYS kanıt günlüğü (IP özeti).
- Çok dilli müşteri ekranı: TR/EN/AR/RU.

---

## 5. Biyerlere (tüketici)

### Temel kavramlar ve kurallar (sayılar koddan)
| Kavram | Kural | Dosya |
|---|---|---|
| **Doğrulanmış ziyaret** | Masa QR'ı okutulur + GPS mekanın **100 m** içinde olmalı; aynı mekanda **4 saat** bekleme; **+50 puan** | `lib/biyerlere/ziyaret.ts` |
| Anket katılımı | +10 puan (GPS'siz olduğu için bilerek küçük, rozet açmaz) | aynı |
| **Rozetler** | ilkAdim (1. ziyaret, +50) · kahveGurmesi (5 farklı mekan, +150) · geceKusu (3 canlı müzikli mekan, +150) · ustaKasif (10 farklı mekan, +300) · mudavim (aynı mekan 4 kez, +200) | `rozet.ts` |
| Seviye | puandan hesaplanır (`seviye`, `sonrakiSeviyeyeKalan`) | `rozet.ts` |
| **Kullanıcı etkinlikleri (buluşmalar)** | Yalnız `ilkAdim` DIŞINDA bir rozeti olan açabilir; kişi başı en çok **3 açık**; başlangıç **30 dk – 60 gün** sonrası; başlangıçtan sonra **4 saat** listede kalır; sadece "ilgileniyorum" işareti (katılım/sohbet yok); işletme duyurularından AYRI; panelden kaldırılabilir | `etkinlik.ts`, `api/app/etkinlikler` |
| Keşfet | varsayılan yarıçap 5 km, en çok 50 km; filtreler (tür, fiyat segmenti, özellikler, `?acik=1` şimdi açık) | `kesfet.ts`, `kesfet-veri.ts` |
| Açık/kapalı | işletme çalışma saatlerinden | `isletme/calisma-saati.ts` |
| Rotalar | admin'in tanımladığı durak listeleri; tamamlama takibi | `rota-veri.ts`, `rota-tamamlama.ts` |
| Davet | davet kodu, +100 puan, kişi başı en çok 20 ödül | `davet.ts` |
| **Kupon + sadakat** | **KAPALI** (`KUPON_AKTIF=false`, hem `lib/biyerlere/kupon.ts` hem `mobil/src/ozellikler.ts`). Sadakat: 10 ziyarette 1 kahve — kod duruyor | `kupon.ts`, `sadakat.ts` |
| Sponsor / Push kredisi / Plus | **Yalnızca admin elle açar-kapatır.** Gerçek ödeme YOK, gerçek push teslimi kurulmadı | `sponsorluk.ts`, `biyerlere-plus.ts` |
| Favoriler, bildirim merkezi, ziyaret geçmişi | var (web + mobil) | `api/app/favoriler`, `bildirimler` |

### Hesap akışları (kullanıcının onayladığı nihai akış)
- **Kayıt:** kullanıcı adı + şifre + ad (telefon zorunlu değil).
- **Oturum içinde şifre değiştirme (SMS YOK):** mevcut şifre + yeni şifre ×2 (eşleşme kontrolü) → `POST /api/app/sifre-degistir`. `passwordChangedAt` güncellenir, diğer oturumlar düşer.
- **Şifremi unuttum (oturum dışı):** 3 ekran
  1. kullanıcı adı → `POST /sifre-kurtar` → doğrulanmış kurtarma numarasına SMS (yanıt her durumda aynı ve ~700 ms, varlık kâhini yok)
  2. kod → `PUT /sifre-kurtar` → kısa ömürlü **tek kullanımlık bilet** (180 sn)
  3. yeni şifre ×2 → `PATCH /sifre-kurtar` → bilet tüketilir (`jetonuTuket`)
- **OTP kodları 3 dakika geçerli**, 5 yanlışta yanar, 60 sn yeniden gönderim beklemesi.
- **Kurtarma numarası** (`AppUser.telefon` + `telefonDogrulandi`, tekil): Profil › Güvenlik'ten eklenir; ekleme/silme mevcut şifre ister; SMS ile doğrulanmadan kaydedilmez. (Mevcut kullanıcıları numara eklemeye zorlamak İSTENMEDİ.)
- **Hesap silme:** `DELETE /api/app/hesap` + mevcut şifre; cascade silme, anketler kimliksizleşir (SetNull). Mağaza şartı.
- **Çıkış:** `POST /api/app/cikis` → jeton sunucuda iptal (`IptalEdilenJeton`), sonra istemci temizlenir.

### `/api/app/*` uç tablosu (`lib/kimlik/api-politika.ts` — TEK KAYNAK)
Tabloda olmayan uç 404, yanlış metot 405, jetonlu uçta jetonsuz istek 401 (middleware'de, DB'ye gitmeden). Test, tablodaki metotların route dosyasının export'larıyla eşleştiğini doğrular.

| Uç | Erişim | Metotlar |
|---|---|---|
| `/giris`, `/kayit` | açık | POST |
| `/sifre-kurtar` | açık | POST, PUT, PATCH |
| `/mekanlar`, `/mekanlar/{slug}` | açık | GET (CDN önbellekli) |
| `/rotalar` | açık | GET |
| `/etkinlikler` | açık (yazma metotları içeride oturum ister) | GET, POST, PUT, DELETE |
| `/mekan-etkilesim` | açık | POST (anonim metrik) |
| `/ben`, `/profil`, `/cuzdan`, `/bildirimler` | jetonlu | GET |
| `/favoriler` | jetonlu | GET, POST |
| `/konum`, `/ziyaret`, `/plus-talep`, `/sifre-degistir`, `/cikis` | jetonlu | POST |
| `/push` | jetonlu | POST, DELETE |
| `/telefon` | jetonlu | GET, POST, PUT, DELETE |
| `/hesap` | jetonlu | DELETE |

Yeni uç eklerken: route dosyası + politika satırı + (gerekirse) hız sınırı.

### Mobil uygulama ayrıntıları
- Jeton SecureStore'da; `oturum.hazirla` yalnızca 401/403'te jetonu siler (ağ hatasında kullanıcıyı atmaz).
- `useVeri` + `onbellek.ts`: AsyncStorage, 7 gün; internetsizken Keşfet önbellekten açılır.
- Bildirime dokununca ilgili mekan sayfası açılır (`useLastNotificationResponse`; web'de `.web.ts` no-op çünkü çöküyordu).
- Evrensel bağlantılar: `EXPO_PUBLIC_SITE_DOMAIN` → iOS associatedDomains / Android intentFilters; sunucu tarafı `.well-known` dosyaları `IOS_TEAM_ID`, `ANDROID_SHA256_FINGERPRINTS` ister.
- RN-web'de `Alert.alert` düğmeleri çalışmaz → her onay `onayIste()` üzerinden.
- React Compiler açık: render içinde `Date.now()` yasak (`useState(() => Date.now())`).
- Mobil testler saf dosyalar üzerinde; react-native import eden store'u doğrudan test etme (Flow parse hatası) — saf kısmı ayrı dosyaya çıkar.

---

## 6. Veri modeli (Prisma, 45 model)

- **Kiracı/panel:** `Account`, `Payment`, `Business`, `User`, `UserBusiness`, `UserPhone`, `OtpCode`, `LoginAttempt`, `AuditLog`, `JobRun`, `PanelNotification`, `Notification`, `PushSubscription`, `IptalEdilenJeton`
- **Anket/menü/masa:** `Table`, `Zone`, `CategoryTemplate`, `Feedback`, `ItemRating`, `MenuCategory`, `MenuItem`, `SurveyView`, `Duyuru`, `MarketingConsent`, `Coupon`
- **Rezervasyon:** `Rezervasyon`, `RezervasyonMasa`
- **Personel:** `ShiftAssignment`, `ShiftSwapRequest`, `LeaveRequest`, `ShiftNote`, `ChecklistItem`, `ChecklistCompletion`
- **Biyerlere:** `AppUser`, `AppFavorite`, `AppVisit` (`mesafeMetre` zorunlu), `AppBadge`, `AppOtpCode`, `AppPushSubscription`, `AppEtkinlik`, `AppEtkinlikIlgi`, `Rota`, `RotaDurak`, `RotaTamamlama`, `MekanEtkilesim`

Notlar: `User` ve `AppUser` ayrı kullanıcı adı havuzları. Görseller (logo/kapak) data URI olarak DB'de. Şema değişikliği: `npm run db:migrate` (yerelde) / `prisma migrate deploy` (üretimde) — **DB paylaşımlı olduğu için migration doğrudan canlıya gider.** `prisma generate` sonrası dev sunucusu yeniden başlatılmalı (yoksa "reading 'upsert' of undefined").

---

## 7. Güvenlik mimarisi (son denetimle sıkılaştırıldı)

### İstek yolu
```
0. Tarayıcı: alanOzellikleri() → input maxLength/pattern (güvenlik sınırı DEĞİL)
1. middleware.ts (Edge, DB yok): HTTPS yönlendirme · /admin çerez var mı · /api/app politika (404/405/401)
2. Route kapısı: panel → getSession (imza + katı kurallar + iptal listesi + kullanıcının güncel hâli)
                 tüketici → appKullaniciGerekli (aynısı + yazma metotlarında SINIRLAR.yazma)
3. govdeOku: Content-Type application/json ZORUNLU, 32 KB üst sınır (akış kesilerek), yalnız nesne
4. Hız sınırı (DB tabanlı, atomik)
5. alanDogrula (lib/cekirdek/desenler.ts — arayüzle aynı kaynak)
6. Saf iş kuralı → Prisma
```

### Jetonlar
| | Panel | Tüketici | Şifre bileti | Giriş adımı (2FA) |
|---|---|---|---|---|
| Dosya | `session-token.ts` | `app-oturum.ts` | `sifre-bileti.ts` | `admin/giris/actions.ts` |
| Audience | `quarkod-panel` | `biyerlere-app` | ayrı | `quarkod-giris-adimi` |
| Ömür | 12 sa | 30 gün | 180 sn, tek kullanım | kısa |

`jeton-kurallari.ts → katiDogrulama()`: yalnız HS256; `exp, iat, sub, jti` zorunlu; `maxTokenAge`; 60 sn saat toleransı; gelecekteki `iat` reddedilir. Her jetonda `jti` var; çıkışta `IptalEdilenJeton`'a yazılır, her istekte kontrol edilir. `passwordChangedAt` öncesi jetonlar geçersiz. Tek `AUTH_SECRET`, dünyaları audience ayırır.

### Hız sınırları (`lib/kimlik/hiz-siniri.ts → SINIRLAR`)
Algoritma: **önce satır ekle → say → sınırı aştıysa kendi satırını sil** (eşzamanlı 40 istek sınırı aşamaz).
| Kanal | Sınır |
|---|---|
| kayit (IP) | 5 / 60 dk |
| ziyaret | 30 / 60 dk |
| metrik | 60 / 10 dk |
| kuponKodu | 10 / 10 dk |
| otpDeneme (kullanıcı) | 20 / 10 dk |
| sifreDogrulama (kullanıcı; şifre değiştir, telefon ekle/sil, hesap sil ORTAK) | 10 / 10 dk |
| kurtarmaIp | 10 / 10 dk |
| etkinlikAc | 10 / 60 dk |
| yazma (oturumlu tüm yazma uçları) | 120 / 10 dk |

**Giriş kilidi** (`login-guard.ts`): kullanıcı adı başı 6, IP başı 20 başarısız / pencere. bcrypt'ten ÖNCE deneme hakkı ayrılır (`girisDenemesiAyir`), sonuç sonra işlenir. Başarılı giriş yalnızca kullanıcı adı sayacını sıfırlar, IP'yi değil.

**İstemci IP** (`istemci-ip.ts`, tek kaynak): `GUVENILIR_IP_BASLIGI` → yoksa Vercel'de `x-vercel-forwarded-for`/`x-real-ip` → geliştirmede `x-forwarded-for` → üretimde güvenilir başlık yoksa `"guvenilmez"` ortak kova. DB'ye IP'nin özeti yazılır.

### Başlıklar (`next.config.ts`)
`poweredByHeader:false`; `/f/*` dışındaki her yolda `X-Frame-Options: DENY` + `frame-ancestors 'none'` (`/f/*` SAMEORIGIN); `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`; HSTS yalnız `HTTPS_ZORUNLU=1` iken. Cron: `CRON_SECRET` sabit süreli karşılaştırma.

### Üretim açılış kontrolü (`uretim-kontrol.ts`)
Üretimde eksik ayarla sunucu AÇILMAZ: `AUTH_SECRET` ≥32 karakter, `NEXT_PUBLIC_APP_URL` gerçek + https, `SMS_TEST_PHONE` boş, 2FA açıksa `SMS_*` dolu.

### Bilinen, kabul edilmiş ödünleşimler
- Saldırgan birinin kullanıcı adına 6 yanlış şifre girip girişini 10 dk kilitleyebilir (CAPTCHA ile yumuşatılabilir).
- Mobil uygulama doğrulaması (App Attest / Play Integrity) yok.
- Kupon doğrulamadaki kontrol/işaretle adımı atomik değil (özellik kapalı).
- `jti` zorunluluğu nedeniyle tüm kullanıcılar bir kez yeniden giriş yapacak.
- Geliştirme ortamında `X-Forwarded-For` bilerek güveniliyor.

---

## 8. Ortam değişkenleri (değerler ASLA belgeye/git'e yazılmaz)

| Değişken | Amaç |
|---|---|
| `DATABASE_URL`, `DIRECT_URL`, `DB_HAVUZ_BOYUTU` | Neon pooler / doğrudan bağlantı |
| `AUTH_SECRET` | Tüm JWT imzası (≥32 kr) |
| `NEXT_PUBLIC_APP_URL` | QR'lara gömülen taban adres (basımdan önce kesinleşmeli) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | E-posta (boşsa konsola yazar) |
| `SMS_API_URL`, `SMS_API_USER`, `SMS_API_PASS`, `SMS_SENDER` | ekomesaj SMS; gönderici başlığı `OTPSMS` |
| `SMS_TEST_PHONE` | Doluysa TÜM kodlar tek numaraya gider — üretimde boş |
| `TWO_FACTOR_ENABLED` | Panel girişinde SMS adımı |
| `CRON_SECRET` | `/api/cron/*` yetkisi |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push |
| `HTTPS_ZORUNLU` | `1` → http→https 308 + HSTS |
| `GUVENILIR_IP_BASLIGI` | Vercel dışı barındırmada gerçek IP başlığının adı |
| `IOS_TEAM_ID`, `ANDROID_SHA256_FINGERPRINTS` | Evrensel bağlantı dosyaları |
| `NEXT_PUBLIC_ILETISIM_TEL/EPOSTA`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `SEED_ADMIN_PHONE` | Diğer |
| Mobil: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SITE_DOMAIN`, `APP_ORTAMI` | API adresi, evrensel bağlantı alanı, derleme profili |

---

## 9. Komutlar

```bash
npm run dev                 # web + API (localhost:3000)
npm test                    # vitest (web)
npm run lint && npx tsc --noEmit
npm run build
npm run guvenlik:tara       # bağımlılık güvenlik taraması (bloklayıcı)
npm run db:migrate          # DİKKAT: paylaşımlı DB → canlıya uygulanır
npm run demo:biyerlere | demo:app-kullanici | demo:veri   # demo verisi (canlıya yazar!)
npm run isler:gunluk        # kvkk temizliği + yedek + (günüyse) haftalık rapor
cd mobil && npx expo start  # mobil (web için --web)
cd mobil && npx vitest run  # mobil testler
```

---

## 10. Durum ve yapılacaklar

### Tamamlanan son işler (bu dalda)
Şifre kurtarma/değiştirme akışları · kurtarma numarası · hesap silme · açık/kapalı rozeti + "şimdi açık" süzgeci · favoriler · bildirim merkezi · rotalar sekmesi · ziyaret geçmişi · kullanıcı etkinlikleri (web + mobil + panel moderasyonu) · çevrimdışı önbellek · evrensel bağlantı altyapısı · bildirimden sayfaya geçiş · mobil testler · EAS profilleri · kapsamlı güvenlik denetimi (IP sahteciliği, eşzamanlı sınır aşımı, jeton sıkılaştırma, sunucu tarafı çıkış, tek kullanımlık bilet, gövde sınırı, clickjacking, konum izni, X-Powered-By, cron karşılaştırması, CDN önbelleği).

### Kullanıcının yapması gerekenler (kimlik bilgisi/karar gerektiriyor)
- [ ] SSL sertifikası → `HTTPS_ZORUNLU=1`, mobil `EXPO_PUBLIC_API_URL=https://…`
- [ ] SMS paketi kredisi (sağlayıcı `ERR_EMPTY_SMS_PACKAGE` dönüyor)
- [ ] Vercel env: `DATABASE_URL` (pooler), `DIRECT_URL`, `AUTH_SECRET`, `TWO_FACTOR_ENABLED`, `SMS_*`, `CRON_SECRET`; Vercel dışıysa `GUVENILIR_IP_BASLIGI`
- [ ] Üretim için AYRI veritabanı (şu an dev = prod)
- [ ] `eas init` (Expo hesabı), `EXPO_PUBLIC_SITE_DOMAIN`, `IOS_TEAM_ID`, `ANDROID_SHA256_FINGERPRINTS`
- [ ] Harita karo sağlayıcısı anahtarı (OSM kullanım politikası üretim trafiğine izin vermez)
- [ ] Sentry DSN (`instrumentation.ts` hazır)
- [ ] Demo superadmin (`demo.platform@ornek.test`) şifresini değiştir; demo hesaplarını canlıdan temizle
- [ ] `guvenlik-ve-yapi` dalını `main`'e PR ile birleştir
- [ ] Gerçek Google yorum linkleri, KVKK metninin hukukçu kontrolü

### Açık fikirler / olası sonraki işler
- Web mekan sayfasında "Buluşma aç" düğmesi (mobilde var)
- Giriş kilidi kötüye kullanımına CAPTCHA
- App Attest / Play Integrity
- Gerçek ödeme (Sponsor/Plus), gerçek push kredisi teslimi
- Kupon/sadakat yeniden açılırsa atomik kupon yakma
- WhatsApp/Telegram bildirim kanalı, aylık rapor, QR süre aşımı arayüzü
