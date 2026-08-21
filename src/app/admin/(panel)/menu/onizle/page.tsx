import Link from "next/link";
import { requireMenuErisim } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { IsletmeSecici, MenuSekmeleri } from "../MenuUst";
import { menuSecimi } from "../_secim";

export const dynamic = "force-dynamic";

export const metadata = { title: "Menü görünümüm" };

export default async function MenuOnizlePage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireMenuErisim();
  const query = await searchParams;
  const { businesses, secili, menuAcik, onizlemeMasa, urunSayisi } =
    await menuSecimi(user, query.isletme);

  if (!secili) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  // Önizlemenin gösterilebilmesi için üç şart var; hangisi eksikse onu ve
  // çözümünü söylüyoruz. Eskiden hepsinde müşteri tarafının "Bu karekod
  // artık geçerli değil" hatası görünüyordu — işletmeciyi paniğe sokan,
  // hiçbir şey anlatmayan bir ekran.
  const eksik = !menuAcik
    ? ({
        baslik: "QR menü modülü kapalı",
        ikon: "🔒",
        metin:
          "Bu hesapta QR menü modülü açık değil; müşteri kodu okuttuğunda doğrudan değerlendirme ekranına gider. Açtırmak için bizimle iletişime geçin.",
        aksiyon: null,
      } as const)
    : urunSayisi === 0
      ? ({
          baslik: "Henüz aktif bir menü yok",
          ikon: "🍽️",
          metin:
            "Menünüzde yayında ürün olmadığı için müşteriye gösterilecek bir şey yok. Bir şablon seçtiğinizde ya da kendi ürünlerinizi eklediğinizde bu ekranda görünür olacak.",
          aksiyon: (
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/admin/menu/sablonlar"
                className="rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2.5 text-small font-semibold text-white shadow-card transition hover:brightness-110"
              >
                Hazır şablonlara göz at →
              </Link>
              <Link
                href="/admin/menu"
                className="rounded-control border border-line bg-surface px-4 py-2.5 text-small font-medium text-ink-soft transition hover:bg-canvas"
              >
                Kendim ekleyeyim
              </Link>
            </div>
          ),
        } as const)
      : onizlemeMasa === null
        ? ({
            baslik: "Henüz QR noktası yok",
            ikon: "▦",
            metin:
              "Menü hazır ama müşterinin okutacağı bir kod yok. Masalara özel kodlar ya da tek bir ortak kod oluşturduğunuzda önizleme burada açılır.",
            aksiyon: (
              <Link
                href={`/admin/isletmeler/${secili.id}/masalar`}
                className="rounded-control bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2.5 text-small font-semibold text-white shadow-card transition hover:brightness-110"
              >
                Masalar &amp; QR noktaları →
              </Link>
            ),
          } as const)
        : null;

  return (
    <div className="flex flex-col gap-5">
      <MenuSekmeleri aktif="gorunum" />

      <PageHeader
        ikon="📱"
        renk="sky"
        title="Menü görünümüm"
        description="Müşteri masadaki kodu okuttuğunda tam olarak bunu görüyor. Aşağıdaki ekran canlı — dokunup gezinebilirsiniz."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/menu/onizle" />

      {eksik ? (
        <EmptyState baslik={eksik.baslik} ikon={eksik.ikon} aksiyon={eksik.aksiyon}>
          {eksik.metin}
        </EmptyState>
      ) : (
        <>
          {/* Telefon genişliğinde çerçeve: bu ekran zaten yalnızca mobilde açılıyor. */}
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface shadow-pop ring-8 ring-ink">
            <iframe
              src={`/f/${secili.slug}/${encodeURIComponent(onizlemeMasa)}/menu`}
              title="Müşteri gözüyle QR menü"
              className="h-[720px] w-full"
            />
          </div>
          <p className="text-center text-caption text-ink-muted">
            Önizleme{" "}
            <strong className="text-ink-soft">
              {onizlemeMasa === "giris" ? "giriş QR'ı" : `masa ${onizlemeMasa}`}
            </strong>{" "}
            üzerinden açıldı · {urunSayisi} ürün yayında
          </p>
        </>
      )}
    </div>
  );
}
