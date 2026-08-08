import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium tracking-wide text-slate-400 uppercase">
          Sayfa bulunamadı
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
          Aradığınız sayfa burada değil
        </h1>
        <p className="mt-3 text-[15px] text-slate-600">
          Bağlantı eski olabilir ya da adres yanlış yazılmış olabilir.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
