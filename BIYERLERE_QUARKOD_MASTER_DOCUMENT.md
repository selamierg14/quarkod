# 🏛️ BİYERLERE & QUARKOD — BÜYÜK PROJE MASTER ŞARTNAMESİ & MİMARİ DOKÜMANI

> **Belge Tipi:** Tam Kapsamlı Ürün Şartnamesi, Sistem Mimarisi, UI/UX Mockup ve İş Modeli Dokümanı  
> **Sürüm:** 4.0.0 (Master Release)  
> **Tarih:** 2026  
> **Ekosistem:** Quarkod (B2B Restoran/Kafe İşletim Motoru) + Biyerlere (B2C Sosyal Keşfet & Sadakat Pazaryeri)  
> **Teknoloji Yığını:** Next.js 16 (App Router, Server Actions), PostgreSQL, Prisma 7, Tailwind CSS 4, PWA / Native Mobile  

---

# İÇİNDEKİLER

1. [Proje Özeti ve Vizyon](#1-proje-özeti-ve-vizyon)
2. [Ekosistem Mimarisi: Quarkod ve Biyerlere Birlikteliği](#2-ekosistem-mimarisi-quarkod-ve-biyerlere-birlikteliği)
3. [Roller ve Operasyon Akışları (Kimin Gözünden Ne Görünüyor?)](#3-roller-ve-operasyon-akışları)
4. [Oyunlaştırma (Gamification) & %100 Doğrulanmış Masa Yorumları](#4-oyunlaştırma-ve-doğrulanmış-masa-yorumları)
5. [Tasarım Sistemi & Görsel Kimlik (Design System)](#5-tasarım-sistemi-ve-görsel-kimlik)
6. [Tüm Mobil Ekran Mockup'ları (Detaylı ASCII Çizimleri)](#6-tüm-mobil-ekran-mockupları)
7. [Para Kazanma ve Gelir Modeli (Monetization Engine)](#7-para-kazanma-ve-gelir-modeli)
8. [Güvenlik, Sahtecilik Önleme & KVKK Standartları](#8-güvenlik-sahtecilik-önleme-ve-kvkk)
9. [Veritabanı & Prisma Model Eşleştirmeleri](#9-veritabanı-ve-prisma-model-eşleştirmeleri)
10. [Uygulama ve Canlıya Geçiş Yol Haritası](#10-uygulama-ve-canlıya-geçiş-yol-haritası)

---

# 1. PROJE ÖZETİ VE VİZYON

Bu proje, yeme-içme ve eğlence sektöründeki iki büyük kopukluğu tek bir çatı altında çözen hibrit bir ekosistemdir:

1. **İşletmeler Açısından (B2B - Quarkod):** Kafeler masadaki QR menülerini, fiyatlarını, müşteri memnuniyet puanlarını, vardiyalarını ve hafta sonu etkinliklerini (canlı müzik, DJ, indirim) tek bir modern panelden yönetir.
2. **Kullanıcılar Açısından (B2C - Biyerlere):** Şehirdeki gençler ve dışarı çıkmayı sevenler, *"Bu hafta sonu nerede canlı müzik var, nerede indirim var, nerede ders çalışılır?"* sorularının cevabını canlı harita, hikaye akışları ve sahte olmayan **doğrulanmış masa yorumlarıyla** keşfeder. Masada QR okuttukça rozetler ve hediye kahveler kazanır.

---

# 2. EKOSİSTEM MİMARİSİ: QUARKOD VE BİYERLERE BİRLİKTELİĞİ

İki ayrı veritabanı veya iki ayrı sunucu **yoktur**. Sistem, tek bir merkezi PostgreSQL veritabanı üzerinde çalışan iki entegre vitrinden oluşur:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MERKEZİ POSTGRESQL VERİTABANI                            │
│           (İşletmeler, Menüler, Duyurular/Afişler, Geri Bildirimler, Rozetler, Kuponlar)         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
           ┌────────────────────────────────┴────────────────────────────────┐
           ▼                                                                 ▼
┌──────────────────────────────────────┐                  ┌──────────────────────────────────────┐
│       QUARKOD YÖNETİM PANELİ         │                  │      BİYERLERE MOBİL KEŞFET          │
│          (/admin & /f/...)           │                  │       (/kesfet, /harita...)          │
├──────────────────────────────────────┤                  ├──────────────────────────────────────┤
│ 👨‍🍳 Kafe Sahibi:                      │                  │ 👤 Müşteri (Son Kullanıcı):          │
│ • Menü & Fiyat Girişi                │                  │ • Canlı Müzik & Fırsat Keşfi         │
│ • 30 sn'de Etkinlik/Afiş Yayınlama   │                  │ • Haritada Canlı Pinleri Gezme       │
│ • Masa QR Kodları Basma              │◄────────────────►│ • WhatsApp'tan Arkadaş Grubuyla Paylaş│
│ • Müşteri Puanlarını İnceleme        │                  │ • Dinamik QR ile Kasada İndirim Al   │
│ • Kasada İndirim Kuponu Doğrulama    │                  │ • Masada QR ile Rozet & Puan Toplama │
│ • Masadaki Müşteri Web Deneyimi      │                  │ • Turist Modu (Çok Dilli Rehber)     │
└──────────────────────────────────────┘                  └──────────────────────────────────────┘
```

---

# 3. ROLLER VE OPERASYON AKIŞLARI

### 👑 1. Platform Yöneticisi (Superadmin - Sen)
* **Yetki Alanı:** Tüm hesaplar, sistem ayarları ve gelir yönetimi.
* **Ne Yapar?**
  * Sponsorlu Hero Banner'ları onaylar ve sıralar (Hangi kafenin afişi en tepede görünecek).
  * Bölgesel bildirim kotalarını tanımlar.
  * Rozet kazanma kurallarını ve sadakat puan eşiklerini belirler.
  * Şehir/Semt listelerini yönetir.

### 🏢 2. Kafe Sahibi / İşletme Müdürü (Owner / Manager)
* **Yetki Alanı:** Yalnızca kendi kafesi/şubeleri.
* **Ne Yapar?**
  * Bilgisayardan veya cepten 30 saniyede canlı müzik afişi yükler.
  * Hafta içi boş masaları doldurmak için 2 saatlik "Flaş İndirim (Happy Hour)" başlatır.
  * Masadaki QR menü fiyatlarını günceller (Sufle tükendiğinde tek tıkla kapatır).
  * Masada müşterinin açtığı kuponları kamerayla okutup "Kullanıldı" işaretler.
  * Müşteri şikayetlerini anında görüp çözüldü olarak işaretler.

### 🏃 3. Garson / Kasa Personeli (Floor Staff)
* **Yetki Alanı:** Sipariş, masa ve kupon doğrulama.
* **Ne Yapar?**
  * Müşteri *"Biyerlere'den %20 indirimim var"* dediğinde ekrandaki geri sayımlı QR kodu doğrular.
  * Günlük açılış/kapanış kontrol listelerini işaretler.

### 👤 4. Müşteri / Son Kullanıcı (End User)
* **Yetki Alanı:** Keşfet, Harita, Cüzdan, Profil ve Masada Puanlama.
* **Ne Yapar?**
  * Evden veya dışarıdan canlı müzik, sakin çalışma mekanı veya indirim arar.
  * Beğendiği mekanı tek tıkla WhatsApp grubuna atıp plan yapar.
  * Kafeye gittiğinde masadaki Quarkod QR kodunu okutup puan verir, rozet kazanır.
  * Arkadaşını davet ederek ikisi de ücretsiz kahve kazanır.

---

# 4. OYUNLAŞTIRMA VE DOĞRULANMIŞ MASA YORUMLARI

### 🛡️ %100 Doğrulanmış Masa Ziyareti (Anti-Fake Review)
Google Maps veya Foursquare'deki sahte yorumların önüne geçmek için yorum yapma kuralı şudur:
* Müşteri sadece **masada otururken fiziksel QR kodu okuttuğunda** ve **GPS mesafesi 100 metrenin altındayken** değerlendirme yapabilir.
* Bu yorumlar Biyerlere uygulamasında **"✅ Doğrulanmış Masa Ziyareti"** yeşil mührüyle en üste çıkar.

### 🎖️ Rozet Koleksiyonu (Badges & Levels)
| Rozet Adı | İkon | Kazanma Koşulu | Kullanıcıya Faydası |
| :--- | :---: | :--- | :--- |
| **Kahve Gurmesi** | ☕ | 5 farklı 3. nesil kahvecide doğrulanmış değerlendirme yap | Seçili kahvecilerde %15 indirim |
| **Gece Kuşu / Sahne Müdavimi** | 🎸 | Canlı müzikli 3 mekanda bulun ve puanla | Canlı müzik girişinde ücretsiz ikram |
| **Tatlı Avcısı** | 🍰 | 5 farklı mekanda tatlıları puanla | 1 adet ücretsiz tatlı kuponu |
| **Usta Kaşif (Seviye 3)** | 🥇 | Toplam 10 doğrulanmış mekan ziyareti | Özel Gurme profili; yorumları en üstte çıkar |
| **Müdavim** | 👑 | Aynı kafeyi ayda 4 kez ziyaret et ve puanla | O kafenin özel VIP müşteri indirimi |

---

# 5. TASARIM SİSTEMİ VE GÖRSEL KİMLİK

* **Tasarım Felsefesi:** Enerjik, modern, şehirli ve görsel odaklı (Urban & Alive).
* **Renk Paleti:**
  * **Primary (Ana Vurgu):** `#6366F1` (Elektrik İndigo) — Teknoloji ve gece/gündüz uyumu.
  * **Secondary (Aksiyon & Sosyalleşme):** `#FF5A36` (Sıcak Gün Batımı) — Etkinlikler ve "Fırsatı Yakala" butonları.
  * **Koyu Mod Zemini:** `#0F172A` (Koyu Gece Mavisi).
  * **Cam Efekti (Glassmorphism):** `rgba(30, 41, 59, 0.85)` + `backdrop-filter: blur(12px)`.
* **Konsept Rozet Renkleri:**
  * 🎸 Canlı Müzik: `#EC4899` (Neon Pembe)
  * 🔥 Flaş İndirim: `#10B981` (Zümrüt Yeşili)
  * ☕ Kahve & Çalışma: `#F59E0B` (Sıcak Amber)
  * 💨 Nargile / Lounge: `#8B5CF6` (Derin Mor)
  * ⚽ Maç Yayını: `#3B82F6` (Canlı Mavi)

---

# 6. TÜM MOBİL EKRAN MOCKUP'LARI

Aşağıda uygulamanın 8 ana ekranının tam bileşen hiyerarşisi ve ASCII yerleşimleri yer almaktadır:

---

### 📱 EKRAN 1: Ana Akış & Keşfet (Feed & Discovery)
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
│   [ 🔍 Keşfet (Aktif) ]  [ 🗺️ Harita ]  [ 🎟️ ]  [ 👤 ]│
└────────────────────────────────────────────────────────┘
```

---

### 🎛️ EKRAN 2: Detaylı Arama & Filtreleme Modalı (Filter Sheet)
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

### 🗺️ EKRAN 3: Harita & Canlı Radar Görünümü (Map View)
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

### 🏢 EKRAN 4: Mekan Detay & Canlı Profil (Quarkod Entegrasyonu)
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
│ 🍰 ÖNE ÇIKAN LEZZETLER (Quarkod Canlı Menüsü):         │
│ • Levrek Marin ......... ₺380 (⭐ 4.9)                 │
│ • Ege Otlu Güveç ....... ₺290 (⭐ 4.8)                 │
│ [ Tüm Menüyü Gör (64 Ürün) -> ]                       │
└────────────────────────────────────────────────────────┘
```

---

### 🎟️ EKRAN 5: Cüzdanım & Kasada Kupon Kullanma (Wallet)
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

### 🎉 EKRAN 6: Masada QR Puanlama & Rozet Kazanma Anı
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

### 👤 EKRAN 7: Profilim & Arkadaş Davet Et (Viral Referral)
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

### 📱 EKRAN 8: Mekan Sahibi "Hızlı Cep Modu" (Kafe Kontrol Merkezi)
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

# 7. PARA KAZANMA VE GELİR MODELİ (MONETIZATION ENGINE)

Platform 4 farklı kanaldan güçlü nakit akışı üretir:

1. **Sponsorlu Etkinlik Sabitleme (Hero Banner):**
   * Kafeler, cuma ve cumartesi gecesi canlı müzik veya parti afişlerini Keşfet ana ekranının tepesindeki büyük karta sabitlemek için haftalık/aylık reklam bedeli öder.
2. **Bölgesel Flaş Bildirim Kredileri (Geofence Push Notification):**
   * Kafe, çevresindeki 3 km içindeki tüm Biyerlere kullanıcılarına anlık push bildirim göndermek için kredi satın alır (*Örn: 1.000 Kişiye Bildirim: ₺350*).
3. **Biyerlere Plus (B2C Tüketici Kulübü):**
   * Kullanıcılar ayda ₺99 vererek üye kafelerde her gün 1 ücretsiz filtre kahve veya içeceklerde %20 sabit indirim hakkı kazanır.
4. **Quarkod B2B SaaS Abonelikleri:**
   * Kafelerin masadaki QR menü, vardiya yönetimi, SMS geri bildirim ve personel yönetimini kullandığı aylık/yıllık yazılım lisans bedeli.

---

# 8. GÜVENLİK, SAHTECİLİK ÖNLEME VE KVKK

1. **GPS Çemberi Doğrulaması:** Masadaki QR okutulsa bile, kullanıcının koordinatları kafenin 100 metre yarıçapında değilse değerlendirme ve rozet puanı verilmez (uzaktan sahte puanlama engellenir).
2. **15 Dakikalık Dinamik Kupon Rotasyonu:** Cüzdandaki kupon QR kodları her 15 dakikada bir tek kullanımlık şifrelenmiş jetonla tazelenir; ekran görüntüsü alıp arkadaşa gönderme suistimali biter.
3. **KVKK Kanıt Günlüğü (Audit Log):** İletişim izni veren müşterilerin IP adresi, açık rıza anı ve aydınlatma metninin tam kopyası saklanır; 90 gün sonra otomatik anonimleştirilir.

---

# 9. VERİTABANI VE PRISMA MODEL EŞLEŞTİRMELERİ

Mevcut PostgreSQL & Prisma şeması bu sistemi birebir destekleyecek şekilde hazırdır:

| Modül / Özellik | İlgili Prisma Modeli | Kullanılan Kritik Alanlar |
| :--- | :--- | :--- |
| **Mekan Bilgisi & Rozetler** | `Business` | `id`, `name`, `type`, `address`, `coverUrl`, `logoUrl`, `tags`, `priceSegment`, `latitude`, `longitude` |
| **Canlı Afişler & Etkinlikler** | `Duyuru` | `id`, `businessId`, `baslik`, `aciklama`, `imageUrl`, `baslangic`, `bitis`, `aktif` |
| **Doğrulanmış Masa Puanları** | `Feedback` & `ItemRating` | `overallRating`, `comment`, `tableId`, `ipHash`, `visitorId`, `isPublic` |
| **Kullanıcı & Rozet Seviyesi** | `User` / `UserBadge` | `userId`, `badgeType`, `points`, `unlockedAt` |
| **Fırsat Kuponları & Cüzdan** | `Coupon` | `code`, `discount`, `used`, `expiresAt`, `source: "badge_reward"` |
| **Masa QR Entegrasyonu** | `Table` | `tableNumber`, `qrToken`, `isEntrance` |
| **Abonelik & Reklam Ödemeleri**| `Payment` & `Account` | `amountKurus`, `note`, `extendedTo`, `recordedBy`, `plan` |

---

# 10. UYGULAMA VE CANLIYA GEÇİŞ YOL HARİTASI

1. **Faz 1: Veritabanı ve API Katmanı**
   * `Business` modeline `tags`, `latitude`, `longitude` ve `priceSegment` alanlarının eklenmesi.
   * `Duyuru` modelinin etkinlik takvimiyle zenginleştirilmesi.
2. **Faz 2: Mobil Arayüzün Kodlanması (`src/app/kesfet`)**
   * Keşfet akışı, Harita radar bileşeni, Cüzdan ve Profil sayfalarının Next.js + Tailwind CSS ile responsive ve PWA uyumlu kodlanması.
3. **Faz 3: Kafe Cep Paneli & QR Doğrulama**
   * Kafe yöneticisinin telefonundan tek tıkla afiş yükleyeceği ve kupon yakacağı ekranların Quarkod paneline entegrasyonu.
4. **Faz 4: Canlı Test & Pilot Kafe Lansmanı**
   * Mevcut pilot kafelerde (Keskin Lezzetler, Sahne Marin, Ege Cunda Balık) masa QR'larından Keşfet'e müşteri akışının test edilmesi ve ilk doğrulanmış rozetlerin dağıtılması.
