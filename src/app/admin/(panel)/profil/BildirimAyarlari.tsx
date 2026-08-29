"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Alert, Button, SectionCard } from "@/components/ui";
import { pushAboneOl, pushAbonelikSil } from "./push-actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Düşük puanlı bir geri bildirim geldiğinde telefona anlık bildirim.
 *
 * Web Push üç bacaklı: tarayıcı bir "abonelik" üretir (bu bileşen),
 * sunucu o aboneliğe mesaj gönderir (bkz. src/lib/push.ts), service
 * worker mesajı yakalayıp ekranda gösterir (bkz. public/sw.js).
 *
 * iOS'ta katı bir kısıt var: Web Push yalnızca site "Ana Ekrana Ekle" ile
 * kurulduğunda çalışıyor — Safari'de sekme olarak açıkken izin isteği
 * sessizce reddedilir. Bu yüzden durumu üç halde tutuyoruz: kurulmamış
 * (talimat göster), kurulu ama abone değil (buton göster), abone (kapat
 * seçeneği göster). Android/masaüstü Chrome'da bu kısıt yok, ilk hal hiç
 * görünmez.
 */
type Durum = "yukleniyor" | "desteklenmiyor" | "kurulum-gerekli" | "kapali" | "acik";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const veri = (base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/");
  const ham = window.atob(veri);
  const dizi = new Uint8Array(ham.length);
  for (let i = 0; i < ham.length; i++) dizi[i] = ham.charCodeAt(i);
  return dizi;
}

/** iOS Safari'de "Ana Ekrana Ekle" ile açılmış mı; diğer tarayıcılarda display-mode. */
function bagimsizModda(): boolean {
  if ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  return window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * Apple'ın "Ana Ekrana Ekle" kısıtına tabi bir cihaz mı?
 *
 * Kullanıcı ajanına bakmak tek başına yetmiyor: iPadOS 13'ten beri iPad
 * kendini "Macintosh" olarak tanıtıyor, yani /iPad/ testi modern iPad'lerde
 * hiç tutmuyordu ve kullanıcı yararlı "önce ana ekrana ekle" yönergesi
 * yerine genel bir hata görüyordu. Dokunmatik bir "Mac" pratikte iPad'dir.
 */
function appleKisitiVarMi(): boolean {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return true;
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

function abonelikDisiDurum(): Durum {
  return !bagimsizModda() && appleKisitiVarMi() ? "kurulum-gerekli" : "kapali";
}

export function BildirimAyarlari() {
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [hata, setHata] = useState<string | null>(null);
  const [islemde, setIslemde] = useState(false);

  useEffect(() => {
    let iptal = false;

    async function kontrolEt() {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!iptal) setDurum("desteklenmiyor");
        return;
      }

      const kayit = await navigator.serviceWorker.register("/sw.js");
      const abonelik = await kayit.pushManager.getSubscription();

      if (iptal) return;
      setDurum(abonelik ? "acik" : abonelikDisiDurum());
    }

    kontrolEt().catch(() => {
      if (!iptal) setDurum("desteklenmiyor");
    });

    return () => {
      iptal = true;
    };
  }, []);

  async function bildirimleriAc() {
    setHata(null);
    setIslemde(true);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setHata("Bildirim izni verilmedi. Telefonun ayarlarından izin vermen gerekiyor.");
        return;
      }

      const kayit = await navigator.serviceWorker.ready;
      const abonelik = await kayit.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });

      const sonuc = await pushAboneOl(abonelik.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      });
      if (sonuc.error) {
        setHata(sonuc.error);
        return;
      }
      setDurum("acik");
    } catch {
      setHata("Bildirimler açılamadı. Tarayıcı bunu desteklemiyor olabilir.");
    } finally {
      setIslemde(false);
    }
  }

  async function bildirimleriKapat() {
    setIslemde(true);
    try {
      const kayit = await navigator.serviceWorker.ready;
      const abonelik = await kayit.pushManager.getSubscription();
      if (abonelik) {
        await pushAbonelikSil(abonelik.endpoint);
        await abonelik.unsubscribe();
      }
      setDurum(abonelikDisiDurum());
    } finally {
      setIslemde(false);
    }
  }

  if (durum === "desteklenmiyor") return null;

  return (
    <SectionCard
      ikon={<Bell className="h-4 w-4" aria-hidden="true" />}
      renk="violet"
      title="Bildirimler"
      description="Düşük puanlı bir geri bildirim geldiğinde telefonuna anlık bildirim düşer."
    >
      {durum === "yukleniyor" ? (
        <p className="text-small text-ink-muted">Kontrol ediliyor…</p>
      ) : durum === "kurulum-gerekli" ? (
        <Alert tone="uyari" baslik="Önce ana ekrana eklemen gerekiyor">
          iPhone ve iPad&apos;de bildirim alabilmek için bu sayfayı{" "}
          <strong>paylaş menüsünden &quot;Ana Ekrana Ekle&quot;</strong> ile kurman
          gerekiyor — Safari sekmesinde açıkken Apple bildirim iznine izin
          vermiyor. Kurduktan sonra uygulamayı oradan aç, bu kart aç/kapat
          düğmesine dönüşecek.
        </Alert>
      ) : durum === "acik" ? (
        <Alert
          tone="basari"
          baslik={
            <span className="flex items-center gap-2">
              <BellRing className="h-4 w-4" aria-hidden="true" />
              Bu cihazda bildirimler açık.
            </span>
          }
          aksiyon={
            <Button
              variant="secondary"
              size="sm"
              onClick={bildirimleriKapat}
              disabled={islemde}
            >
              Kapat
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-muted">
            Şu an bu cihazda bildirimler kapalı. Panel açık olmasa bile eşiğin
            altında bir puan geldiğinde haber alırsın.
          </p>
          {/* Bu düğmeye pratikte telefondan basılıyor: `lg` boyutu 48px
              dokunma hedefi veriyor (bkz. components/ui/Button.tsx). */}
          <Button
            size="lg"
            className="w-fit"
            onClick={bildirimleriAc}
            loading={islemde}
            loadingLabel="Açılıyor…"
          >
            Bildirimleri aç
          </Button>
        </div>
      )}

      {hata ? (
        <div className="mt-3">
          <Alert tone="hata">{hata}</Alert>
        </div>
      ) : null}
    </SectionCard>
  );
}
