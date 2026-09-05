import { renkler, turRenkleri, turSimgeleri } from "../../tasarim";
import type { MekanOzet } from "../../api/tipler";

/**
 * Harita, WebView içinde çalışan bir Leaflet sayfası olarak kuruluyor.
 *
 * NEDEN `react-native-maps` DEĞİL: o paket native modül içeriyor, yani
 * Expo Go'da hiç açılmıyor — haritayı görmek için her seferinde bir
 * development build (ve iOS tarafında Xcode) gerekiyor. Bu, "haritayı
 * görmek için önce derleme kur" demek olurdu. Leaflet + WebView ise hem
 * Expo Go'da hem web önizlemesinde ÇALIŞIYOR ve web sürümüyle AYNI
 * görsel dili (aynı pin renkleri, aynı emoji kuralı, aynı koyu tema)
 * paylaşıyor.
 *
 * Takas açık: gerçek native harita kadar akıcı değil ve çevrimdışı
 * çalışmıyor. Uygulama mağazaya çıkmadan önce react-native-maps'e
 * geçmek doğru olur; o güne kadar harita sekmesi boş durmuyor.
 *
 * Pinden native tarafa iletişim `postMessage` ile: kullanıcı bir pine
 * dokunduğunda WebView mekanın id'sini gönderiyor, detay kartını React
 * Native tarafı çiziyor — yani panelin kendisi gerçek native, yalnızca
 * haritanın kendisi web.
 */

const LEAFLET_SURUM = "1.9.4";

export type HaritaMekani = Pick<
  MekanOzet,
  "id" | "ad" | "tur" | "konum" | "ozellikler" | "etkinlikler"
>;

/** Pin rengi — web sürümündeki `pinRengi` ile birebir aynı öncelik sırası. */
function pinRengi(mekan: HaritaMekani): string {
  if (mekan.ozellikler.includes("canliMuzik")) return "#EC4899";
  if (mekan.etkinlikler.length > 0) return "#10B981";
  return turRenkleri[mekan.tur] ?? renkler.vurgu;
}

/** JSON'u HTML script bloğuna güvenle gömmek için. */
function guvenliJson(deger: unknown): string {
  return JSON.stringify(deger)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function haritaHtmlUret(
  mekanlar: HaritaMekani[],
  merkez: { enlem: number; boylam: number },
  kullaniciKonumu: { enlem: number; boylam: number } | null,
): string {
  const pinler = mekanlar
    .filter((m) => m.konum.enlem !== null && m.konum.boylam !== null)
    .map((m) => ({
      id: m.id,
      ad: m.ad,
      enlem: m.konum.enlem,
      boylam: m.konum.boylam,
      renk: pinRengi(m),
      simge: turSimgeleri[m.tur] ?? "📍",
    }));

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_SURUM}/dist/leaflet.css" />
<style>
  html, body, #harita { margin:0; padding:0; height:100%; width:100%; background:${renkler.zemin}; }
  /* OpenStreetMap karoları açık renkli; uygulamanın koyu temasına
     uyması için ters çevirip renk tonunu geri döndürüyoruz. Ayrı bir
     koyu karo servisi (Mapbox/Stadia) API anahtarı isterdi. */
  .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.75); }
  .leaflet-container { background:${renkler.zemin}; outline:none; }
  .leaflet-control-attribution { background:rgba(18,18,20,0.7); color:#8b8b93; font-size:9px; }
  .leaflet-control-attribution a { color:#a9a9b3; }
  .leaflet-control-zoom { display:none; }
  .pin {
    width:34px; height:34px; border-radius:999px;
    display:flex; align-items:center; justify-content:center;
    font-size:16px; line-height:1;
    border:2px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.5), 0 0 0 3px rgba(18,18,20,0.55);
    transition:transform 140ms ease-out;
  }
  .pin:active { transform:scale(0.92); }
  .pin.secili { transform:scale(1.18); box-shadow:0 4px 14px rgba(0,0,0,0.6), 0 0 0 4px rgba(255,255,255,0.25); }
  .ben {
    width:16px; height:16px; border-radius:999px;
    background:${renkler.vurgu}; border:2.5px solid #fff;
    box-shadow:0 0 0 6px rgba(124,107,255,0.28);
  }
</style>
</head>
<body>
<div id="harita"></div>
<script src="https://unpkg.com/leaflet@${LEAFLET_SURUM}/dist/leaflet.js"></script>
<script>
(function () {
  var mekanlar = ${guvenliJson(pinler)};
  var merkez = ${guvenliJson([merkez.enlem, merkez.boylam])};
  var benimKonum = ${guvenliJson(kullaniciKonumu ? [kullaniciKonumu.enlem, kullaniciKonumu.boylam] : null)};

  function nativeGonder(veri) {
    // Aynı sayfa hem WebView'de (ReactNativeWebView) hem web
    // önizlemesinde (iframe → parent) çalışıyor.
    var metin = JSON.stringify(veri);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(metin);
    else if (window.parent !== window) window.parent.postMessage(metin, "*");
  }

  var harita = L.map("harita", {
    center: merkez,
    zoom: 12,
    zoomControl: false,
    attributionControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(harita);

  if (benimKonum) {
    L.marker(benimKonum, {
      icon: L.divIcon({ html: '<div class="ben"></div>', className: "", iconSize: [16,16], iconAnchor: [8,8] }),
    }).addTo(harita);
  }

  var seciliEl = null;
  var isaretler = [];
  /** Son pin seçiminin zamanı — harita tıklamasıyla yarışı engelliyor. */
  var sonSecim = 0;

  mekanlar.forEach(function (m) {
    var ikon = L.divIcon({
      html: '<div class="pin" style="background:' + m.renk + '">' + m.simge + '</div>',
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    var isaret = L.marker([m.enlem, m.boylam], { icon: ikon, title: m.ad }).addTo(harita);
    isaret.on("click", function (olay) {
      /*
       * Olayı BURADA durdurmak şart.
       *
       * Leaflet'te divIcon'lu bir işaretçiye dokunmak, olayı haritanın
       * kendisine de taşıyabiliyor. O zaman sırayla "mekanSecildi" ve
       * hemen ardından "secimTemizlendi" gidiyor; kart açılır açılmaz
       * kapanıyor ve dışarıdan "bazen çalışmıyor" gibi görünüyor.
       */
      L.DomEvent.stopPropagation(olay);
      sonSecim = Date.now();

      if (seciliEl) seciliEl.classList.remove("secili");
      var el = isaret.getElement() && isaret.getElement().querySelector(".pin");
      if (el) { el.classList.add("secili"); seciliEl = el; }
      // Seçilen pin, açılacak kartın altında kalmasın diye harita
      // yukarı kaydırılıyor.
      harita.panTo([m.enlem, m.boylam], { animate: true, duration: 0.35 });
      nativeGonder({ tur: "mekanSecildi", id: m.id });
    });
    isaretler.push(isaret);
  });

  harita.on("click", function () {
    /*
     * İkinci kalkan: stopPropagation'ın yakalayamadığı durumlar için
     * (dokunmatikte Leaflet bazı sürümlerde ayrı bir sentetik tıklama
     * üretiyor) seçimden hemen sonraki harita tıklaması yok sayılıyor.
     * Kullanıcının gerçekten "boşluğa dokunup kapatma" niyeti bundan
     * çok daha geç geliyor.
     */
    if (Date.now() - sonSecim < 400) return;
    if (seciliEl) { seciliEl.classList.remove("secili"); seciliEl = null; }
    nativeGonder({ tur: "secimTemizlendi" });
  });

  /*
   * Leaflet, kabın boyutunu yalnızca kurulurken ölçüyor. WebView/iframe
   * ilk karede henüz son boyutuna ulaşmamış oluyor ve harita, ekranın
   * bir bölümüne sıkışıp kalıyordu (sağda ve altta boş şerit). Boyut
   * her değiştiğinde yeniden ölçtürüyoruz.
   */
  /*
   * BİLEREK fitBounds YOK.
   *
   * Tüm pinleri birden sığdırmak, şehir geneline yayılmış 50+ mekanda
   * haritayı Marmara'nın tamamına kadar uzaklaştırıyor ve pinler
   * okunamayan bir yığına dönüşüyordu. Harita uygulamalarının yaptığı
   * gibi kullanılabilir bir şehir yakınlığında açılıp gerisini
   * kullanıcının kaydırmasına bırakmak daha okunur bir başlangıç.
   */
  function yenidenOlc() {
    harita.invalidateSize({ animate: false });
  }
  if (window.ResizeObserver) {
    new ResizeObserver(yenidenOlc).observe(document.getElementById("harita"));
  }
  window.addEventListener("resize", yenidenOlc);
  window.addEventListener("orientationchange", function () { setTimeout(yenidenOlc, 250); });
  setTimeout(yenidenOlc, 60);

  nativeGonder({ tur: "hazir" });
})();
</script>
</body>
</html>`;
}
