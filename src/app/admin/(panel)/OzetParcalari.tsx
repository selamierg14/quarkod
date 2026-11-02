import Link from "next/link";
import type { ReactNode } from "react";
import { DefterBolumu } from "@/components/ui";

/**
 * Özet ekranının parçaları — "servis defteri" tasarımı.
 *
 * Kart dizisi yerine sayfa gibi akan bölümler (bkz. DefterBolumu). Her
 * parça saf sunum: veriyi sayfa topluyor, burası yalnızca çiziyor.
 * Saatler 06:00–24:00 ölçeğinde; ölçek dışındaki (gece yarısından sonra)
 * kayıtlar kenara yapışıyor, kaybolmuyor.
 */

export const OLCEK_BAS = 6;
export const OLCEK_SON = 24;

/** Günün saati (ondalık) → ölçekte yüzde. */
export function olcekX(saat: number): number {
  const kirp = Math.min(OLCEK_SON, Math.max(OLCEK_BAS, saat));
  return ((kirp - OLCEK_BAS) / (OLCEK_SON - OLCEK_BAS)) * 100;
}

/** Date → İstanbul saatiyle ondalık saat (14:30 → 14.5). */
export function ondalikSaat(t: Date): number {
  return t.getHours() + t.getMinutes() / 60;
}

export function saatMetni(t: Date): string {
  return t.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" });
}

export function puanRengi(puan: number): string {
  return puan <= 2 ? "var(--color-danger)" : puan === 3 ? "var(--color-warning)" : "var(--color-success)";
}

export function puanMetinRengi(puan: number): string {
  return puan <= 2 ? "text-danger" : puan === 3 ? "text-warning-ink" : "text-success-ink";
}

/** ●●○○○ — yıldızdan daha az gürültülü, mono yazıyla hizalı. */
export function noktaPuan(puan: number): string {
  const p = Math.max(0, Math.min(5, Math.round(puan)));
  return "●".repeat(p) + "○".repeat(5 - p);
}

// --- Günün akışı ------------------------------------------------------

export function GununAkisi({
  noktalar,
  simdi,
}: {
  noktalar: { saat: number; puan: number; etiket: string; href: string }[];
  simdi: number;
}) {
  const saatler = [6, 9, 12, 15, 18, 21, 24];
  return (
    <figure className="m-0 flex flex-col gap-1.5" aria-label="Günün akışı: bugün gelen geri bildirimler">
      <div className="relative h-14 border-t border-ink bg-sunken/60">
        {saatler.slice(1, -1).map((s) => (
          <span
            key={s}
            aria-hidden="true"
            className="absolute top-0 bottom-0 border-l border-line"
            style={{ left: `${olcekX(s)}%` }}
          />
        ))}
        {noktalar.map((n, i) => (
          <Link
            key={i}
            href={n.href}
            title={n.etiket}
            aria-label={n.etiket}
            className="absolute bottom-3 -ml-[7px] h-3.5 w-3.5 rounded-full ring-[3px] ring-surface transition hover:scale-125"
            style={{ left: `${olcekX(n.saat)}%`, backgroundColor: puanRengi(n.puan) }}
          />
        ))}
        {simdi >= OLCEK_BAS && simdi <= OLCEK_SON ? (
          <div aria-hidden="true" className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-ink" style={{ left: `${olcekX(simdi)}%` }}>
            <span className="absolute -top-4 left-1.5 font-mono text-[11px] font-semibold whitespace-nowrap">ŞİMDİ</span>
          </div>
        ) : null}
      </div>
      <div aria-hidden="true" className="relative h-4">
        {saatler.map((s) => (
          <span
            key={s}
            className="absolute -translate-x-1/2 font-mono text-[11px] text-ink-faint first:translate-x-0 last:-translate-x-full"
            style={{ left: `${olcekX(s)}%` }}
          >
            {String(s % 24).padStart(2, "0")}:00
          </span>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-4 text-caption text-ink-faint">
        {[
          ["var(--color-success)", "4–5 puan"],
          ["var(--color-warning)", "3 puan"],
          ["var(--color-danger)", "1–2 puan"],
        ].map(([renk, ad]) => (
          <span key={ad} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: renk }} />
            {ad}
          </span>
        ))}
        {noktalar.length === 0 ? <span>Bugün henüz geri bildirim gelmedi.</span> : null}
      </figcaption>
    </figure>
  );
}

// --- Sayı satırı (karo değil, cetvel) ---------------------------------

export function SayiSatiri({
  sayilar,
}: {
  sayilar: { etiket: string; deger: string; not?: string; tonu?: "notr" | "iyi" | "kotu" | "dikkat" }[];
}) {
  return (
    <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] border-t border-line">
      {sayilar.map((k) => (
        <div key={k.etiket} className="mr-5 border-r border-line py-3.5 pr-5 last:mr-0 last:border-r-0">
          <dt className="text-small text-ink-faint">{k.etiket}</dt>
          <dd className="m-0 mt-1.5 flex items-baseline gap-2.5">
            <span
              className={`font-display text-[34px] leading-none font-semibold tracking-[-0.03em] tabular ${
                k.tonu === "dikkat" ? "text-danger" : "text-ink"
              }`}
            >
              {k.deger}
            </span>
            {k.not ? (
              <span
                className={`font-mono text-caption ${
                  k.tonu === "iyi" ? "text-success-ink" : k.tonu === "kotu" || k.tonu === "dikkat" ? "text-danger" : "text-ink-faint"
                }`}
              >
                {k.not}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// --- Servis fişleri ----------------------------------------------------

export type Fis = {
  id: string;
  masa: string;
  puan: number;
  zaman: string;
  isletme?: string;
  yorum: string | null;
  zayif: string;
};

export function ServisFisleri({ fisler, eylem }: { fisler: Fis[]; eylem: ReactNode }) {
  return (
    <DefterBolumu
      baslik="Yanıt bekleyen"
      sayi={fisler.length}
      sayiTonu={fisler.length ? "dikkat" : "notr"}
      eylem={eylem}
    >
      {fisler.length === 0 ? (
        <p className="py-4 text-small text-ink-muted">
          Bekleyen şikâyet yok. Eşiğin altında bir puan geldiğinde burada fiş olarak belirir.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
          {fisler.map((f) => (
            <Link
              key={f.id}
              href={`/admin/geri-bildirimler/${f.id}`}
              className="group flex flex-col rounded-[4px] border border-line border-t-4 bg-canvas/60 transition hover:border-line-strong hover:bg-surface"
              style={{ borderTopColor: puanRengi(f.puan) }}
            >
              <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3">
                <div className="min-w-0">
                  <span className="block truncate font-display text-[22px] leading-none font-bold tracking-[-0.02em] text-ink">
                    {f.masa}
                  </span>
                  <span className="mt-1 block font-mono text-caption text-ink-faint">
                    {f.zaman}
                    {f.isletme ? ` · ${f.isletme}` : ""}
                  </span>
                </div>
                <span
                  className={`font-mono text-caption font-semibold tracking-[0.08em] ${puanMetinRengi(f.puan)}`}
                  aria-label={`${f.puan} / 5 puan`}
                >
                  {noktaPuan(f.puan)}
                </span>
              </div>
              <div aria-hidden="true" className="mx-4 border-t border-dashed border-line-strong" />
              <p className="m-0 line-clamp-3 flex-1 px-4 py-3 text-small text-ink-soft">
                {f.yorum || <span className="text-ink-faint">Yorum bırakılmadı.</span>}
              </p>
              <div className="flex items-center justify-between gap-2 px-4 pb-3.5">
                <span className="truncate font-mono text-caption text-danger">{f.zayif}</span>
                <span className="shrink-0 border-b-2 border-cta text-small font-semibold text-ink">Aç</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DefterBolumu>
  );
}

// --- Kategori karnesi --------------------------------------------------

export function KategoriKarnesi({
  kategoriler,
  sorunlar,
}: {
  kategoriler: { ad: string; ortalama: number; adet: number }[];
  sorunlar: { kategori: string; alan: string; adet: number }[];
}) {
  const enZayif = kategoriler[0]?.ad;
  return (
    <DefterBolumu baslik="Kategori karnesi" aciklama="son 90 gün">
      {kategoriler.length === 0 ? (
        <p className="py-4 text-small text-ink-muted">
          Kategori puanı gelmedi. Müşteriler detay yıldızlarını doldurdukça dolar.
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {kategoriler.map((k) => {
            const zayif = k.ad === enZayif && k.ortalama < 4;
            return (
              <li
                key={k.ad}
                className={`grid grid-cols-[56px_minmax(0,1fr)] items-baseline gap-3 border-b border-line py-2.5 ${
                  zayif ? "bg-danger-soft/50" : ""
                }`}
              >
                <span
                  className={`font-display text-[24px] leading-none font-semibold tracking-[-0.02em] tabular ${
                    zayif ? "text-danger" : "text-ink"
                  }`}
                >
                  {k.ortalama.toFixed(1).replace(".", ",")}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{k.ad}</span>
                  <span className="text-caption text-ink-faint">{k.adet} değerlendirme</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {sorunlar.length > 0 ? (
        <div className="mt-4">
          <p className="text-small font-semibold text-ink-muted">En çok işaretlenen sorun</p>
          <ul className="mt-1.5 list-none p-0">
            {sorunlar.map((s) => (
              <li key={`${s.kategori}-${s.alan}`} className="flex items-baseline justify-between gap-3 py-1">
                <span className="min-w-0 truncate text-small text-ink-soft">
                  <span className="text-ink-faint">{s.kategori} · </span>
                  {s.alan}
                </span>
                <span className="shrink-0 font-mono text-caption text-ink">{s.adet}×</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DefterBolumu>
  );
}

// --- Vardiya akışı -----------------------------------------------------

export type VardiyaSatiri = {
  ad: string;
  planBas: number | null;
  planSon: number | null;
  giris: number | null;
  cikis: number | null;
  durum: string;
  durumTonu: "iyi" | "uyari" | "kotu" | "notr";
};

export function VardiyaAkisi({ satirlar, simdi, eylem }: { satirlar: VardiyaSatiri[]; simdi: number; eylem?: ReactNode }) {
  const ton = { iyi: "text-success-ink", uyari: "text-warning-ink", kotu: "text-danger", notr: "text-ink-faint" };
  return (
    <DefterBolumu baslik="Vardiya akışı" eylem={eylem}>
      {satirlar.length === 0 ? (
        <p className="py-4 text-small text-ink-muted">Bugün için vardiya ataması yok.</p>
      ) : (
        <>
          <ul className="m-0 list-none p-0">
            {satirlar.map((p) => {
              const gercekSon = p.cikis ?? (p.giris !== null ? simdi : null);
              return (
                <li key={p.ad} className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-3 border-b border-line py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-ink">{p.ad}</span>
                    <span className={`font-mono text-[11px] ${ton[p.durumTonu]}`}>{p.durum}</span>
                  </span>
                  <span className="relative h-4" aria-hidden="true">
                    {p.planBas !== null && p.planSon !== null ? (
                      <span
                        className="absolute top-0.5 h-3 rounded-[3px] border border-dashed border-ink-faint"
                        style={{ left: `${olcekX(p.planBas)}%`, width: `${olcekX(p.planSon) - olcekX(p.planBas)}%` }}
                      />
                    ) : null}
                    {p.giris !== null && gercekSon !== null ? (
                      <span
                        className="absolute top-0.5 h-3 rounded-[3px] bg-kabuk"
                        style={{ left: `${olcekX(p.giris)}%`, width: `${Math.max(0.6, olcekX(gercekSon) - olcekX(p.giris))}%` }}
                      />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-caption text-ink-faint">
            Kesikli çerçeve planlanan vardiya, dolu çubuk QR ile okutulan giriş–çıkış. Ölçek 06:00–24:00.
          </p>
        </>
      )}
    </DefterBolumu>
  );
}

// --- Bu akşam ----------------------------------------------------------

export function BuAksam({
  rezervasyonlar,
  eylem,
}: {
  rezervasyonlar: { id: string; saat: string; ad: string; kisi: number; masa: string; durum: string; bekliyor: boolean }[];
  eylem?: ReactNode;
}) {
  const kisi = rezervasyonlar.reduce((t, r) => t + r.kisi, 0);
  return (
    <DefterBolumu
      baslik="Bugünkü rezervasyonlar"
      aciklama={rezervasyonlar.length ? `${rezervasyonlar.length} rezervasyon · ${kisi} kişi` : undefined}
      eylem={eylem}
    >
      {rezervasyonlar.length === 0 ? (
        <p className="py-4 text-small text-ink-muted">Bugün için kalan rezervasyon yok.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rezervasyonlar.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line py-2.5 sm:grid-cols-[64px_minmax(0,1fr)_160px_120px]"
            >
              <span className="font-mono text-[15px] font-semibold text-ink">{r.saat}</span>
              <span className="min-w-0 truncate font-medium text-ink">
                {r.ad} <span className="font-normal text-ink-faint">· {r.kisi} kişi</span>
              </span>
              <span className="hidden truncate text-ink-soft sm:block">{r.masa}</span>
              <span className={`text-small font-semibold ${r.bekliyor ? "text-warning-ink" : "text-success-ink"}`}>{r.durum}</span>
            </li>
          ))}
        </ul>
      )}
    </DefterBolumu>
  );
}
