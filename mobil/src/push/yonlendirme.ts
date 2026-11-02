import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

/**
 * Bildirime dokununca ilgili sayfayı açar.
 *
 * Eksik olan buydu: flaş indirim bildirimi "⚡ Galata Cafe" diyor,
 * kullanıcı dokunuyor ve uygulama Keşfet'te açılıyordu. Hangi mekan
 * olduğunu hatırlayıp elle aramak zorunda kalıyordu — yani bildirimin
 * yarattığı niyet, uygulamanın açılışında kayboluyordu.
 *
 * Sunucu mesaja `data: { slug }` koyuyor (bkz. admin/biyerlere/actions.ts).
 * Burada yapılan iş o slug'ı mekan sayfasına çevirmek.
 *
 * `useLastNotificationResponse` İKİ DURUMU BİRDEN karşılıyor: uygulama
 * açıkken gelen dokunuş ve uygulama KAPALIYKEN bildirimle açılış. İkincisi
 * elle yazılınca kolayca atlanan durum — dinleyici ancak uygulama
 * açıldıktan sonra bağlandığı için, açılışa sebep olan dokunuşu hiç
 * görmüyor.
 */
export function useBildirimYonlendirme() {
  const router = useRouter();
  const sonYanit = Notifications.useLastNotificationResponse();

  /**
   * Aynı yanıt iki kez yönlendirmesin.
   *
   * Hook, yanıtı bileşen yeniden çizildikçe aynı nesneyle veriyor; kimlik
   * tutulmazsa kullanıcı mekan sayfasından geri çıktığında bir sonraki
   * çizimde yeniden oraya atılıyordu.
   */
  const islenenKimlik = useRef<string | null>(null);

  useEffect(() => {
    if (!sonYanit) return;

    // Bildirimin GÖVDESİNE dokunmak: eylem düğmelerinden biri değil.
    if (sonYanit.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const kimlik = sonYanit.notification.request.identifier;
    if (islenenKimlik.current === kimlik) return;

    const veri = sonYanit.notification.request.content.data as
      | Record<string, unknown>
      | null;
    const slug = typeof veri?.slug === "string" ? veri.slug : null;
    if (!slug) return;

    /**
     * Slug DOĞRULANIYOR. İçeriği uzak bir sunucudan geliyor ve doğrudan
     * yola ekleniyor; "../" ya da eğik çizgi taşıyan bir değer,
     * yönlendirmeyi hiç amaçlanmamış bir ekrana çevirebilirdi.
     */
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return;

    islenenKimlik.current = kimlik;
    router.push(`/mekan/${slug}`);
  }, [sonYanit, router]);
}
