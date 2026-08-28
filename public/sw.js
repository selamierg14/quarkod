/**
 * Panelin service worker'ı.
 *
 * İki iş görüyor:
 * 1. "Ana ekrana ekle" ile kurulan panelin birkaç temel dosyayı (kabuk,
 *    ikonlar) cihazda tutması — internet anlık kesildiğinde beyaz bir
 *    hata sayfası yerine en azından uygulamanın kabuğu açılsın diye.
 *    Panel verisi (geri bildirimler, çizelge) bilerek önbelleğe alınmıyor:
 *    bayat bir çizelgeyi "güncel" gibi göstermek, hiç göstermemekten kötü.
 * 2. Push bildirimlerini karşılayıp göstermek (bkz. src/lib/push.ts).
 *
 * Panelin geri kalanı (rota bazlı, sürekli değişen sayfalar) bilerek
 * önbelleğe alınmıyor: agresif bir cache stratejisi "menüyü güncelledim
 * ama müşteri hâlâ eskisini görüyor" tarzı hatalara yol açar — burada da
 * "yönetici hâlâ dün akşamki çizelgeyi görüyor" karşılığı olurdu.
 */

const ONBELLEK = "mm-kabuk-v1";
const KABUK_DOSYALARI = ["/admin", "/icon", "/apple-icon"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ONBELLEK)
      .then((cache) => cache.addAll(KABUK_DOSYALARI))
      .catch(() => {
        // Kurulum sırasında ağ yoksa sessizce geç: service worker yine de
        // kaydolsun, bir sonraki ziyarette kabuk dosyaları önbelleğe girer.
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((anahtarlar) =>
        Promise.all(
          anahtarlar
            .filter((ad) => ad !== ONBELLEK)
            .map((ad) => caches.delete(ad)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Yalnızca GET ve yalnızca kendi kökenimiz: form gönderimlerine ya da
  // başka bir siteye giden isteklere karışmıyoruz.
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  // Ağ öncelikli, önbellek yalnızca ağ tamamen düştüğünde devreye giriyor
  // (offline'da "hiçbir şey açılmadı" yerine en azından kabuk açılsın).
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
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
      // Panel zaten açık bir sekmede duruyorsa yeni sekme açmak yerine
      // onu öne getirip oraya yönlendiriyoruz.
      for (const client of liste) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
