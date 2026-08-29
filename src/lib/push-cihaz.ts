import { pushAbonelikSil } from "@/app/admin/(panel)/profil/push-actions";

/**
 * Bu cihazın push aboneliğini hem tarayıcıdan hem sunucudan kapatır.
 *
 * Çıkışta çağrılıyor. Çıkış eskiden yalnızca oturum çerezini siliyordu;
 * abonelik ise cihazda kalıyordu. Ortak kullanılan bir telefon ya da
 * tablette bu, çıkış yapmış kullanıcının kilit ekranına müşteri
 * yorumlarının düşmeye devam etmesi demekti.
 *
 * Sunucu kaydı kapatılıyor AMA tarayıcı aboneliği de iptal ediliyor:
 * yalnızca ilkini yapmak, sunucu tarafında unutulmuş bir kayıt kalırsa
 * bildirimin yine düşmesine izin verirdi.
 */
export async function cihazAboneliginiKapat(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Bilerek `ready` değil: service worker hiç kayıtlı değilse `ready`
    // asla çözülmez ve çıkış sonsuza kadar askıda kalırdı.
    const kayit = await navigator.serviceWorker.getRegistration();
    const abonelik = await kayit?.pushManager.getSubscription();
    if (!abonelik) return;

    await pushAbonelikSil(abonelik.endpoint, "Kullanıcı çıkış yaptı.");
    await abonelik.unsubscribe();
  } catch {
    // Bildirim temizliği çıkışı engellememeli: kullanıcı her hâlükârda
    // oturumunu kapatabilmeli.
  }
}
