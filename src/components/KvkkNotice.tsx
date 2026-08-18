"use client";

import { CONTACT_RETENTION_DAYS } from "@/lib/kvkk";
import type { MetinAnahtari } from "@/lib/ceviriler";
import { useDil } from "./DilSaglayici";

/** Aydınlatma metninin maddeleri: başlık + gövde anahtarı. */
const MADDELER: { baslik: MetinAnahtari; govde?: MetinAnahtari }[] = [
  { baslik: "kvkk.sorumluBaslik" },
  { baslik: "kvkk.veriBaslik", govde: "kvkk.veriMetin" },
  { baslik: "kvkk.amacBaslik", govde: "kvkk.amacMetin" },
  { baslik: "kvkk.dayanakBaslik", govde: "kvkk.dayanakMetin" },
  { baslik: "kvkk.sureBaslik", govde: "kvkk.sureMetin" },
  { baslik: "kvkk.haklarBaslik", govde: "kvkk.haklarMetin" },
];

/**
 * Anket ekranında açılıp kapanan aydınlatma metni.
 *
 * Çeviriler nezaket amaçlı: turist okuyamadığı bir metne rıza veremez.
 * Ama hukuken bağlayıcı olan Türkçe sürüm — bunu her çeviride açıkça
 * yazıyoruz, yoksa çeviri hatası onayı tartışmaya açardı.
 */
export function KvkkNotice({ businessName }: { businessName: string }) {
  const { t } = useDil();
  const asilDil = t("kvkk.asilDil");

  return (
    <details className="mt-3 rounded-control bg-canvas text-small">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-ink-soft marker:hidden">
        <span className="underline decoration-line-strong underline-offset-2">
          {t("kvkk.baslik")}
        </span>
        <span className="float-end text-ink-faint" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <dl className="space-y-3 px-3 pt-1 pb-4">
        {MADDELER.map((madde) => (
          <div key={madde.baslik}>
            <dt className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
              {t(madde.baslik)}
            </dt>
            <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
              {madde.govde
                ? t(madde.govde, { gun: CONTACT_RETENTION_DAYS })
                : `${businessName}.`}
            </dd>
          </div>
        ))}
        {asilDil ? (
          <p className="border-t border-line pt-3 text-[12px] text-ink-faint">
            {asilDil}
          </p>
        ) : null}
      </dl>
    </details>
  );
}
