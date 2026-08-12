import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-sm text-center">
        <p className="text-small font-medium tracking-wide text-ink-faint uppercase">
          Sayfa bulunamadı
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          Aradığınız sayfa burada değil
        </h1>
        <p className="mt-3 text-body text-ink-soft">
          Bağlantı eski olabilir ya da adres yanlış yazılmış olabilir.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-block rounded-control bg-ink px-5 py-3 text-small font-medium text-white"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
