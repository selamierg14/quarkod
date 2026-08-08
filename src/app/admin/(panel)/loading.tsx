/**
 * Panel sayfaları arası geçişte iskelet.
 *
 * Sayfalar force-dynamic ve veritabanına gidiyor; gösterge olmadan tıklama
 * ile içeriğin gelmesi arasında ekran donmuş gibi görünüyordu.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor…</span>

      <div className="h-5 w-40 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-56 rounded bg-slate-100" />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="h-8 rounded bg-slate-100" />
              <div className="h-8 rounded bg-slate-100" />
              <div className="h-8 rounded bg-slate-100" />
            </div>
            <div className="mt-4 h-16 rounded bg-slate-50" />
          </div>
        ))}
      </div>
    </div>
  );
}
