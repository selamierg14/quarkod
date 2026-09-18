"use client";

import { useActionState } from "react";
import { kullaniciEtkinliginiKaldir, type EtkinlikKaldirState } from "./actions";

const INITIAL: EtkinlikKaldirState = {};

export type PanelEtkinligi = {
  id: string;
  baslik: string;
  aciklama: string | null;
  baslangic: string;
  acan: string;
  ilgiSayisi: number;
};

/**
 * İşletmenin mekanında açılmış KULLANICI buluşmaları.
 *
 * Bu liste bir moderasyon aracı. Buluşmaları müşteriler açıyor ve mekanın
 * adı onların yazdığı metnin yanında duruyor — yani kötüye kullanımın
 * bedelini içeriği yazan değil, işletme ödüyor. Kaldırma yetkisinin
 * işletmede olması bu yüzden.
 *
 * Liste BOŞKEN de gösteriliyor (bkz. page.tsx): "burada böyle bir şey
 * olabilir" bilgisi, ilk buluşma açıldığında işletmeciyi hazırlıksız
 * yakalamamak için baştan verilmeli.
 */
export function KullaniciEtkinlikleri({ etkinlikler }: { etkinlikler: PanelEtkinligi[] }) {
  const [state, formAction, pending] = useActionState<EtkinlikKaldirState, FormData>(
    kullaniciEtkinliginiKaldir,
    INITIAL,
  );

  if (etkinlikler.length === 0) {
    return (
      <p className="text-small text-ink-muted">
        Şu an mekanınızda açılmış bir müşteri buluşması yok. Müşteriler
        uygulamadan &quot;buluşma&quot; açtığında burada görünür ve gerekirse
        kaldırabilirsiniz.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p
          className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink"
          role="status"
        >
          {state.saved}
        </p>
      ) : null}

      {etkinlikler.map((etkinlik) => (
        <div
          key={etkinlik.id}
          className="flex flex-col gap-2 rounded-card border border-line p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-medium text-ink-strong">{etkinlik.baslik}</p>
            {etkinlik.aciklama ? (
              <p className="mt-1 text-small text-ink-soft">{etkinlik.aciklama}</p>
            ) : null}
            <p className="mt-1 text-caption text-ink-muted">
              {etkinlik.acan} açtı · {tarihMetni(etkinlik.baslangic)} ·{" "}
              {etkinlik.ilgiSayisi} kişi ilgileniyor
            </p>
          </div>

          <form action={formAction} className="flex shrink-0 items-center gap-2">
            <input type="hidden" name="etkinlikId" value={etkinlik.id} />
            {/* Sebep isteğe bağlı ama denetim kaydına giriyor: aylar sonra
                "bu neden kaldırılmıştı" sorusunun tek cevabı bu satır. */}
            <input
              name="sebep"
              placeholder="Sebep (isteğe bağlı)"
              maxLength={200}
              className="w-44 rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-danger-soft px-3 py-2 text-small font-medium text-danger-ink transition hover:brightness-95 disabled:opacity-60"
            >
              {pending ? "…" : "Kaldır"}
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

function tarihMetni(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
