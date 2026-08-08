import Link from "next/link";

export const metadata = {
  title: "Müşteri Memnuniyet Sistemi",
  robots: { index: false },
};

/**
 * Genel karşılama sayfası.
 *
 * Bilerek hiçbir işletme listelenmiyor: sistem artık çok kiracılı ve burası
 * herkese açık. Kiracıların isim listesini yayınlamak, müşteri listemizi
 * yayınlamak demek olurdu.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        Müşteri Memnuniyet Sistemi
      </h1>
      <p className="mt-2 text-slate-600">
        Müşteriler masadaki QR kodu okutarak anketi doldurur. Yönetim tarafı için
        panele giriş yapın.
      </p>

      <Link
        href="/admin"
        className="mt-6 rounded-xl bg-slate-900 px-5 py-3.5 text-center font-medium text-white active:scale-[0.99]"
      >
        Yönetim paneline git
      </Link>
    </main>
  );
}
