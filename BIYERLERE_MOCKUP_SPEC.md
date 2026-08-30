# 📱 Biyerlere (Powered by Quarkod) — Tam Kapsamlı Mobil Mockup & Ürün Şartnamesi

> **Sürüm:** 3.0.0 (Eksiksiz Master Sürüm — Gelir Modeli, Çoklu Dil & Güvenlik Dahil)  
> **Platform:** iOS & Android (PWA / Mobile Native)  
> **Hedef Kitle:** Şehirli & Sosyalleşen Kullanıcılar (B2C) + Kafe/Restoran İşletmecileri (B2B)  
> **Mimari:** Quarkod Masada QR & Menü Motoru + Biyerlere Sosyal Keşfet Vitrini  

---

## 🎯 1. Proje Vizyonu ve Mimari Bağlantı

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QUARKOD B2B MOTORU                              │
│   (Kafe Sahibi: Menü, Fiyat, QR Kod, Duyuru/Afiş, Geri Bildirimler)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        [Ortak Postgres Veritabanı]
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│   MASADAKİ DOĞRULANMIŞ DENEYİM   │        │       BİYERLERE KEŞFET           │
│  - Masadaki QR Okutulur          │        │  - Evden/Dışarıdan Akış İzlenir  │
│  - Değerlendirme & Puan Verilir  │◄──────►│  - Haritada Canlı Pinler Görülür │
│  - 🏆 ROZET & PUAN KAZANILIR     │        │  - Canlı Müzik & İndirim Bulunur │
│  - "Keşfet" Butonuyla Akışa Geçiş│        │  - Arkadaş Davetiyle Kahve Kazan │
└──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 🏆 2. Oyunlaştırma (Gamification) & Rozet Sistemi

Kullanıcılar kafeleri gezdikçe ve **masada QR okutup değerlendirme yaptıkça** puan ve rozet kazanırlar. Sahte yorum engellenir çünkü yorumlar sadece **masada oturan doğrulanmış müşteriden** gelir.

### 2.1 Rozet Türleri (Badges)
| Rozet | Kazanma Şartı | Kazandırdığı Ödül |
| :--- | :--- | :--- |
| ☕ **Kahve Gurmesi** | 5 farklı 3. nesil kahvecide değerlendirme yap | Seçili kahvecilerde %15 indirim |
| 🎸 **Gece Kuşu / Sahne Müdavimi** | Canlı müzikli 3 mekanda bulun ve puanla | Canlı müzik girişinde ücretsiz ikram |
| 🍰 **Tatlı Avcısı** | 5 farklı mekanda tatlıları puanla | 1 adet ücretsiz tatlı kuponu |
| 🥇 **Usta Kaşif (Seviye 3)** | Toplam 10 doğrulanmış mekan ziyareti | "Özel Gurme Rozeti" (Yorumları en üstte çıkar) |
| 👑 **Müdavim** | Aynı kafeyi ayda 4 kez ziyaret et ve puanla | O kafenin özel VIP müşteri indirimi |

---

## 🎨 3. Tasarım Sistemi & Görsel Kimlik (Design System)

* **Primary (Ana Vurgu):** `#6366F1` (Elektrik İndigo) — Dinamizm, teknoloji ve gençlik.
* **Secondary (Aksiyon & Sosyalleşme):** `#FF5A36` (Sıcak Gün Batımı) — Etkinlikler, canlı müzik, "Fırsatı Yakala" butonları.
* **Canlı Pin & Rozet Renkleri:**
  * 🎸 **Canlı Müzik:** `#EC4899` (Neon Pembe)
  * 🔥 **Flaş İndirim:** `#10B981` (Zümrüt Yeşili)
  * ☕ **Kahve & Çalışma:** `#F59E0B` (Sıcak Amber)
  * 💨 **Nargile / Lounge:** `#8B5CF6` (Derin Mor)
  * ⚽ **Maç Yayını:** `#3B82F6` (Canlı Mavi)
* **Koyu Gece Modu & Cam Efekti (Glassmorphism):** Arka plan `#0F172A`, kartlar `rgba(30, 41, 59, 0.85)` + `backdrop-filter: blur(12px)`.

---

## 📱 4. Detaylı Ekran Mockup'ları (Tüm Akışlar)

---

### EKRAN 1: Ana Akış & Keşfet (Feed & Discovery)
> **Kullanıcı Amacı:** "Bu cuma veya hafta sonu nereye gitsek, nerede canlı müzik veya indirim var?"

```text
┌────────────────────────────────────────────────────────┐
│ [📍 Kadıköy, Moda ▾]            [🔍 Arama]  [🔔 (2)]  │
├────────────────────────────────────────────────────────┤
│ 📅 TARİH:  [ (Tümü) ] [ Bugün ] [ Yarın ] [★ Hafta Sonu]│
├────────────────────────────────────────────────────────┤
│ 🔴 CANLI VİTRİN / HİKAYELER (Stories):                 │
│  (🎸 Sahne)   (🔥 %30 Flaş)  (☕ Mocha)   (⚽ Derbi)    │
│  Marin        Keskin         Nevada       Corner Pub   │
├────────────────────────────────────────────────────────┤
│ 🏷️ HIZLI FİLTRELER:                                    │
│  [🎸 Canlı Müzik]  [🔥 İndirimler]  [💻 Çalışma]  [💨] │
├────────────────────────────────────────────────────────┤
│ ⭐ HAFTANIN ÖNE ÇIKAN ETKİNLİĞİ (Hero Banner - Sponsor):│
│ ┌────────────────────────────────────────────────────┐ │
│ │ [ GÖRSEL: Sahne Marin Akustik Gece Afişi ]         │ │
│ │ 🎸 Canlı Müzik · 90'lar Türkçe Pop                 │ │
│ │ 📅 Bu Cuma 21:30   •   📍 Sahne Marin (1.2 km)     │ │
│ │ 🎟️ Biyerlere Özel: Masaya Ücretsiz Meyve Tabağı    │ │
│ │                                                    │ │
│ │ [ 💬 WhatsApp'ta Paylaş ]   [ 🎟️ Fırsatı Al ]     │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 📍 YAKININDAKİ MEKANLAR (Doğrulanmış Yorumlarla):      │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Kapak Fotoğrafı]   🟢 Şimdi Açık (02:00)  ₺₺      │ │
│ │ KESKİN LEZZETLER                 ⭐ 4.8 (142 Yorum)│ │
│ │ 🏷️ Flaş: 2. Kahve %50 İndirimli (Son 3 Saat!)     │ │
│ │ 💬 "San Sebastian enfesti!" — @ahmet (☕ Kahve Gurmesi)│
│ │                                                    │ │
│ │ [ 📋 Menüyü İncele ]     [ 📍 Yol Tarifi (600m) ] │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🧭 ALT MENÜ (Bottom Nav):                              │
│   [ 🔍 Keşfet ]  [ 🗺️ Harita ]  [ 🎟️ Cüzdan ]  [ 👤 ]  │
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 2: Detaylı Arama & Filtreleme Modalı (Filter Bottom Sheet)
> **Kullanıcı Amacı:** Aradığı özel mekan kriterlerine (priz, açık hava, bütçe) göre nokta atışı arama yapmak.

```text
┌────────────────────────────────────────────────────────┐
│ 🎛️ Filtrele ve Özelleştir                    [✖ Kapat] │
├────────────────────────────────────────────────────────┤
│ 📍 MESAFE:                                             │
│  (•) 2 km içinde   ( ) 5 km içinde   ( ) Tüm Şehir     │
├────────────────────────────────────────────────────────┤
│ 💰 BÜTÇE SEGMENTİ:                                     │
│  [ ₺ Ekonomik ]    [ ₺₺ Orta ]    [ ₺₺₺ Premium ]      │
├────────────────────────────────────────────────────────┤
│ ✨ MEKAN ÖZELLİKLERİ:                                  │
│  [✔] 🔌 Priz / Laptop Çalışma Uygun                    │
│  [✔] 🌿 Bahçe / Teras / Açık Hava                      │
│  [ ] 🐶 Evcil Hayvan Dostu (Pet Friendly)              │
│  [ ] 💨 Nargile / Lounge                               │
│  [✔] 📶 Yüksek Hızlı Wi-Fi                             │
│  [ ] 🚗 Otopark / Vale Hizmeti                         │
├────────────────────────────────────────────────────────┤
│ 🎵 ETKİNLİK TÜRÜ:                                      │
│  [✔] Canlı Akustik / Pop   [ ] DJ Performansı          │
│  [ ] Caz & Blues           [ ] Stand-up / Gösteri      │
├────────────────────────────────────────────────────────┤
│ [ Temizle ]                 [ 48 Mekanı Göster (Uygula) ]│
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 3: Harita & Canlı Radar Görünümü (Map View)
> **Kullanıcı Amacı:** Etrafındaki mekanları ve anlık etkinlikleri harita üzerinde parlayan pinlerle görmek.

```text
┌────────────────────────────────────────────────────────┐
│ [🔍 Çevremde ara... ]        [ 🎯 Konumuma Git ]       │
├────────────────────────────────────────────────────────┤
│                                                        │
│         [ 📍 Moda Caddesi ]                            │
│                 🎸 [Sahne Marin (Müzik Var!)]          │
│                                                        │
│      🔥 [Keskin Lezzetler (%50)]                       │
│                                                        │
│                    ☕ [Nevada Cafe]                    │
│           🔵 (Sen Buradasın)                           │
│                                                        │
├────────────────────────────────────────────────────────┤
│ 📌 SEÇİLİ MEKAN KARTI (Haritanın Altında Yükselen):   │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [Küçük Foto] Sahne Marin Lounge    ⭐ 4.9 (210)    │ │
│ │ 🎸 Bu Akşam 21:30: 90'lar Akustik Canlı Müzik      │ │
│ │ 🚶 Yürüme: 6 dakika (450m) • 🟢 Açık (02:00)       │ │
│ │ [ 📍 Yol Tarifi Başlat ]   [ 📋 Menü & Detay ]     │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🧭 ALT MENÜ (Bottom Nav):                              │
│   [ 🔍 Keşfet ]  [ 🗺️ Harita (Aktif) ] [ 🎟️ ]  [ 👤 ] │
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 4: Mekan Detay & Canlı Profil (Quarkod Entegrasyonu)
> **Kullanıcı Amacı:** Mekanın ortamını, güncel menüsünü ve masada oturanların gerçek yorumlarını incelemek.

```text
┌────────────────────────────────────────────────────────┐
│ [< Geri]           [ ❤️ Favorile ]  [ 📤 Paylaş (WA) ] │
├────────────────────────────────────────────────────────┤
│ [             GENİŞ KAPAK FOTOĞRAFI                  ] │
│ [ Logo ]  Sahne Marin Restaurant & Lounge              │
│           ⭐ 4.9 (210)  •  Balıkçı & Canlı Sahne  • ₺₺₺│
│           🟢 Şimdi Açık (12:00 - 02:00)                │
├────────────────────────────────────────────────────────┤
│ HIZLI İLETİŞİM & AKSİYON:                              │
│ [ 📋 QR Menü ] [ 💬 WP Rezervasyon ] [ 📞 Ara ] [ 📷 ] │
├────────────────────────────────────────────────────────┤
│ 📅 BU HAFTAKİ ETKİNLİK TAKVİMİ:                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ CUMA 21:30   · Akustik Trio & Pop     [ Masa Sor ] │ │
│ │ CUMARTESİ    · 80'ler & 90'lar DJ Set [ Masa Sor ] │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 💬 DOĞRULANMIŞ MASA YORUMLARI (Quarkod'dan Gelen):    │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ⭐⭐⭐⭐⭐  Masa 8 · 2 gün önce                      │ │
│ │ 👤 Selin Y. [ 🎸 Gece Kuşu Rozeti ]                │ │
│ │ ✅ Doğrulanmış Masa Ziyareti                       │ │
│ │ "Levrek marin efsaneydi, akustik müzik harika!"    │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🍰 ÖNE ÇIKAN LEZZETLER (Quarkod Menü Verisi):          │
│ • Levrek Marin ......... ₺380 (⭐ 4.9)                 │
│ • Ege Otlu Güveç ....... ₺290 (⭐ 4.8)                 │
│ [ Tüm Menüyü Gör (64 Ürün) -> ]                       │
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 5: Cüzdanım & Kasada Kupon Kullanma (Wallet & Redeem)
> **Kullanıcı & Garson Amacı:** İndirimi masada veya kasada garsona güvenli bir şekilde okutmak.

```text
┌────────────────────────────────────────────────────────┐
│ 🎟️ Cüzdanım & Aktif Kuponlarım                         │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ KESKİN LEZZETLER · 2. Kahve %50 İndirim            │ │
│ │                                                    │ │
│ │       ┌──────────────────────────────┐             │ │
│ │       │    █▀▀▀█ █▀█ █▀▀▀█ █▀▀▀█     │             │ │
│ │       │    █ ▀ █ █ █ █ ▀ █ █ ▀ █     │             │ │
│ │       │    ▀▀▀▀▀ ▀ ▀ ▀▀▀▀▀ ▀▀▀▀▀     │             │ │
│ │       │          #BYR-84920          │             │ │
│ │       └──────────────────────────────┘             │ │
│ │                                                    │ │
│ │ ⏳ DİNAMİK SAYAÇ: 14 dakika 32 saniye kaldı        │ │
│ │ ℹ️ Kasada ödeme yaparken garsona okutunuz.         │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🎁 KAZANDIĞIN PUANLAR & İKRAMLAR:                      │
│ [ ☕ ☕ ☕ ☕ ☕ ⚪ ⚪ ⚪ ⚪ ⚪ ] (5/10 Kahve)        │
│ 5 kahve sonra 1 Ücretsiz Filtre Kahve hesabında!       │
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 6: Masada QR Puanlama & Rozet Kazanma Anı
> **Masadaki Müşteri Deneyimi:** Masadaki QR okutulup 5 yıldız verildiğinde rozet ilerlemesini gösteren tebrik ekranı.

```text
┌────────────────────────────────────────────────────────┐
│  🎉 TEBRİKLER! PUANINIZ KAYDEDİLDİ                     │
├────────────────────────────────────────────────────────┤
│  Sahne Marin deneyiminiz için teşekkür ederiz.         │
│                                                        │
│  ⭐ ⭐ ⭐ ⭐ ⭐                                       │
│                                                        │
│  🏆 +50 Kaşif Puanı Kazandınız!                        │
│  🎸 "Gece Kuşu" Rozetiniz Açıldı!                     │
│  🎁 1 Adet Ücretsiz Tatlı Kuponu Cüzdanınıza Eklendi!  │
│                                                        │
│  [  Rozeti Profilinde Gör  ]                           │
├────────────────────────────────────────────────────────┤
│  🚀 BU ÇEVREDE BAŞKA NELER VAR?                        │
│  [ Biyerlere Keşfet Akışına Geç -> ]                   │
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 7: Profilim, Rozet Koleksiyonum & Arkadaş Davet Et (Viral Referral)
> **Kullanıcı Amacı:** Seviyesini görmek, arkadaşlarını davet edip ücretsiz kahve kazanmak.

```text
┌────────────────────────────────────────────────────────┐
│ 👤 Profilim                                            │
├────────────────────────────────────────────────────────┤
│  [ Fotoğraf ]  Muhammed Demir                          │
│                🏆 Seviye 4 Kaşif · 850 Puan            │
│                📍 14 Doğrulanmış Masa Ziyareti         │
├────────────────────────────────────────────────────────┤
│ 👥 ARKADAŞINI DAVET ET, KAHVE KAZAN! (Viral Loop):     │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🎁 Davet ettiğin her arkadaşın için:               │ │
│ │ İkinize de +100 Puan & 1 Ücretsiz Kahve Kuponu!     │ │
│ │                                                    │ │
│ │ Davet Kodun: BIYERLE-MUHAMMED                      │ │
│ │ [ 💬 WhatsApp ile Davet Linki Gönder ]             │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 🎖️ ROZET KOLEKSİYONUM:                                │
│  [☕ Kahve Gurmesi]  [🎸 Gece Kuşu]  [🍰 Tatlı Avcısı] │
└────────────────────────────────────────────────────────┘
```

---

### EKRAN 8: Mekan Sahibi "Hızlı Cep Modu" (Kafe Kontrol Merkezi)
> **Mekan Sahibi Amacı:** Masasından kalkmadan 30 saniyede etkinlik ve indirim girmek.

```text
┌────────────────────────────────────────────────────────┐
│ 🏢 Sahne Marin — Hızlı İşletme Paneli                  │
├────────────────────────────────────────────────────────┤
│ 📊 BU HAFTAKİ PERFORMANS:                              │
│ ┌──────────────────────┬─────────────────────────────┐ │
│ │ 👁️ 1.840 Görüntülenme│ 📍 94 Yol Tarifi            │ │
│ │ 📋 310 Menü İnceleme │ 🎟️ 28 Kupon Kullanıldı      │ │
│ └──────────────────────┴─────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ ⚡ HIZLI İŞLETME AKSİYONLARI:                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ [ 🎸 + Yeni Etkinlik / Afiş Yayınla (30 sn) ]      │ │
│ │ [ 🔥 Flaş İndirim Başlat (Happy Hour) ]            │ │
│ │ [ 📷 Kasada Müşteri Kuponu / QR Oku ]              │ │
│ └────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ 📌 YAYINDAKİ DUYURULAR:                                │
│ • Cuma Akustik Gece Afişi (Aktif - 1.200 kişi gördü)   │
│   [ ✏️ Düzenle ]   [ ⏹️ Yayından Kaldır ]              │
└────────────────────────────────────────────────────────┘
```

---

## 💰 5. Gelir ve Para Kazanma Modeli (Monetization)

Platformun gelir üreteceği 3 ana kanal:

1. **Öne Çıkarılan Sponsorlu Etkinlikler (Hero Banner):**
   * Kafeler, cuma ve cumartesi gecesi afişlerini Keşfet akışının en tepesindeki Hero Banner'a sabitlemek için haftalık ödeme yapar.
2. **Bölgesel Flaş Bildirim Satışı (Geofence Push Credits):**
   * Kafe, mekanın 3 km çevresindeki tüm kullanıcılara anlık indirim bildirimi göndermek için paket satın alır (Örn: *1000 Kişiye Bildirim: ₺350*).
3. **Biyerlere Plus (B2C Müşteri Kulübü):**
   * Kullanıcılar aylık ₺99 abonelikle üye tüm kafelerde günde 1 ücretsiz kahve / indirimli içecek hakkı kazanır.

---

## 🌍 6. Çoklu Dil Desteği & Turist Modu (TR / EN / AR / RU)

* **Otomatik Dil Tespiti:** Yabancı turistlerin telefon diline göre arayüz anında İngilizce veya Arapça'ya döner.
* **Turist Vitrini:** Yabancı kullanıcılara *"En İyi Geleneksel Türk Kahvesi"*, *"Canlı Müzik & Boğaz Manzarası"* gibi özel turist koleksiyonları sunulur.

---

## 🛡️ 7. Güvenlik, Sahtecilik Önleme & KVKK

1. **GPS Mesafesi Doğrulaması:** Kullanıcının yorum yapıp rozet puanı kazanabilmesi için kafenin 100 metre yarıçapında olması şart koşulur.
2. **Dinamik Kupon Rotasyonu:** Kupon QR kodları 15 dakikada bir otomatik yenilenir; ekran görüntüsü (screenshot) alıp başkasına gönderme suistimali engellenir.
3. **KVKK Açık Rıza:** Müşteri iletişim bilgisi sadece ticari ileti onayı verildiğinde kaydedilir ve 90 gün sonra otomatik temizlenir.

---

## 🔔 8. Akıllı Bildirim (Push Notification & Geofencing) Senaryoları

1. **Hafta Sonu Planı Bildirimi (Cuma 17:30):**
   * *"Bu hafta sonu Kadıköy'de 4 mekanda canlı akustik müzik var. Yerini ayırtmak için tıkla!"*
2. **Konum / Yakınlık Bildirimi (Geofencing - 300 metre):**
   * *"Şu an Sahne Marin'in yakınındasın! Masaya oturduğunda Quarkod QR okut, ücretsiz ikramını kap."*
3. **Flaş İndirim Uyarısı (Happy Hour):**
   * *"Favori kafen Keskin Lezzetler'de önümüzdeki 2 saat boyunca tatlılar %30 indirimli!"*

---

## 🗄️ 9. Veritabanı & Model Eşleştirmeleri (Prisma)

| Özellik | Prisma Tablosu / Alanı | Açıklama |
| :--- | :--- | :--- |
| **Kullanıcı Rozetleri & Seviye** | `User` / `UserBadge` | `userId`, `badgeType`, `points`, `unlockedAt` |
| **Doğrulanmış Yorumlar** | `Feedback` | `overallRating`, `comment`, `tableId` (Masa doğrulaması), `isPublic` |
| **Mekan, Etiketler & Konum** | `Business` | `name`, `coverUrl`, `tags`, `latitude`, `longitude`, `priceSegment` |
| **Etkinlikler & Flaş Duyurular** | `Duyuru` | `baslik`, `aciklama`, `imageUrl`, `baslangic`, `bitis`, `aktif` |
| **Kazanılan & Kullanılan Kuponlar**| `Coupon` | `code`, `discount`, `used`, `expiresAt`, `source` |
| **Gelir / Ödemeler** | `Payment` | `amountKurus`, `note`, `extendedTo`, `recordedBy` |
