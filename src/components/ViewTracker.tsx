"use client";

import { useEffect, useRef } from "react";
import { recordSurveyView } from "@/app/f/[slug]/[table]/actions";

/**
 * Anket ekranı açıldığında bir görüntüleme kaydeder — "kaç kişi QR okuttu,
 * kaçı anketi bitirdi" oranı bunun üzerinden çıkıyor.
 *
 * Görsel bir çıktısı yok; sunucu tarafında tekrar eden görüntülemeler zaten
 * ayıklanıyor, buradaki ref yalnızca React'in geliştirme modundaki çift
 * çalıştırmasını engelliyor.
 */
export function ViewTracker({
  slug,
  tableNumber,
}: {
  slug: string;
  tableNumber: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordSurveyView(slug, tableNumber);
  }, [slug, tableNumber]);

  return null;
}
