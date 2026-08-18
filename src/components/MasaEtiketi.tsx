"use client";

import type { MetinAnahtari } from "@/lib/ceviriler";
import { useDil } from "./DilSaglayici";

/**
 * Hero'daki "Masa 4 · Menü" rozeti.
 *
 * Etiket sunucuda hazır metin olarak üretilseydi çevrilemezdi; masa
 * numarası ve alt başlık anahtarı ayrı geliyor, cümleyi dil katmanı kuruyor.
 */
export function MasaEtiketi({
  masaNo,
  girisMi,
  altBaslik,
}: {
  masaNo: string;
  girisMi: boolean;
  altBaslik?: MetinAnahtari;
}) {
  const { t } = useDil();

  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-caption font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
      {girisMi ? t("ortak.giris") : t("ortak.masa", { no: masaNo })}
      {altBaslik ? <span className="text-white/60">· {t(altBaslik)}</span> : null}
    </p>
  );
}
