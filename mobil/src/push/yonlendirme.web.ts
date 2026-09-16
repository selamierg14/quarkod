/**
 * Bildirim yönlendirmesinin WEB karşılığı — bilerek boş.
 *
 * `expo-notifications`ın `useLastNotificationResponse`'u web'de yok ve
 * çağrıldığında yalnızca uyarı vermiyor, uygulamayı kökten çökertiyor:
 *
 *   The method or property ExpoNotifications.getLastNotificationResponse
 *   is not available on web
 *
 * Tarayıcıda açılan sürüm (Expo Web) bu yüzden tamamen beyaz ekrana
 * düşüyordu. Platform uzantılı dosya, koşullu hook çağırmadan sorunu
 * çözüyor: Metro `.web.ts`yi web derlemesinde, uzantısız dosyayı
 * native'de alıyor. Böylece her platformda hook sayısı ve sırası sabit
 * kalıyor — `Platform.OS` ile dallanan bir hook çağrısı React'in kurallarına
 * aykırı olurdu.
 *
 * Web'de push bildirimi zaten gönderilmiyor; kaybedilen bir davranış yok.
 */
export function useBildirimYonlendirme(): void {
  // Kasıtlı olarak boş.
}
