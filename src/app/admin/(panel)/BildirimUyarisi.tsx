import { bildirimSagligi } from "@/lib/bildirim-sagligi";

/**
 * "Düşük puan uyarıları gitmiyor" bandı.
 *
 * Ürünün satış cümlesi "düşük puanı anında haber alın"; o söz tutulmuyorsa
 * işletme sahibi bunu bilmeli. Gönderim hataları Notification tablosuna
 * yazılıyordu ama hiçbir ekranda görünmüyordu — canlıda iki denemenin ikisi
 * de düşmüştü ve panelde hiçbir iz yoktu.
 *
 * Ayrı bir bileşen olmasının sebebi hız: sorgu panelin ilk boyanmasını
 * bekletmesin diye layout'ta Suspense içinde akıtılıyor.
 */
export async function BildirimUyarisi({
  isletmeIdleri,
}: {
  isletmeIdleri: string[];
}) {
  const durum = await bildirimSagligi(isletmeIdleri);
  if (!durum) return null;

  return (
    <div className="print-hidden bg-danger-line px-4 py-2 text-small text-danger-deep">
      <span className="font-semibold">Bildirim gönderilemiyor:</span> son 7
      günde {durum.basarisiz} düşük puan uyarısı e-postayla iletilemedi (
      {durum.sonHata}). Düşük puanları panelden takip edin; e-posta ayarları
      için bizimle iletişime geçin.
    </div>
  );
}
