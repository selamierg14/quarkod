/**
 * Panelin service worker'ı. Tek işi var: push bildirimlerini karşılamak.
 *
 * Önceden burada bir "uygulama kabuğu" önbelleği vardı ve `/admin` onun
 * içindeydi. `/admin` bir kabuk değil — giriş yapmış kullanıcının Özet
 * panosu: geri bildirimler, işletme adları, puanlar. Üç sorun birden
 * doğuruyordu:
 *
 *  1. `cache.addAll` aynı köken isteğine çerezi ekler, yani kiracıya ait
 *     veri cihazda diske yazılıyordu.
 *  2. Cache API, `Cache-Control: no-store` başlığını tamamen yok sayar;
 *     Next'in `force-dynamic` koruması burada işlemiyordu.
 *  3. Çıkış yapmak önbelleğe dokunmuyordu — kayıt oturumdan uzun yaşıyordu.
 *
 * Ortak bir tablette bu, "bir hesabın kullanıcısı başka bir hesabın
 * verisini göremez" sözünü çiğniyordu. Karşılığında kazandığımız şey ise
 * yoktu: sunucuda render edilen, tamamen dinamik bir panelin çevrimdışı
 * kopyası zaten kullanılabilir bir şey göstermez. Bu yüzden önbellek
 * tamamen kaldırıldı; `activate` artık ESKİ sürümün bıraktığı kayıtları da
 * siliyor, yani düzeltme daha önce kaydolmuş cihazlara da ulaşıyor.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Artık hiçbir önbellek kullanmıyoruz. Bu döngünün asıl işi geçmişi
      // temizlemek: eski "mm-kabuk-v1" önbelleğinde duran panel HTML'i
      // ancak burada silinir, kullanıcıdan bir şey yapması istenmeden.
      .then((anahtarlar) => Promise.all(anahtarlar.map((ad) => caches.delete(ad))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let veri = { baslik: "Quarkod", govde: "Yeni bir bildirim var.", url: "/admin" };
  try {
    if (event.data) veri = { ...veri, ...event.data.json() };
  } catch {
    // Metin gövdeli, JSON olmayan bir push gelirse varsayılan metinle devam.
  }

  event.waitUntil(
    self.registration.showNotification(veri.baslik, {
      body: veri.govde,
      icon: "/icon",
      badge: "/icon",
      data: { url: veri.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      // Yalnızca panel sekmeleri aday: müşteri QR sayfası (/f/...) açık bir
      // telefonda, ilk bulunan pencereyi yönlendirmek müşterinin doldurduğu
      // anketi kapatırdı.
      const panelPenceresi = liste.find(
        (client) => new URL(client.url).pathname.startsWith("/admin") && "focus" in client,
      );

      if (panelPenceresi) {
        panelPenceresi.navigate(url);
        return panelPenceresi.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
