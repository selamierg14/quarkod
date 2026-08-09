import { foldTr } from "./text";

export type FeedbackQuery = {
  isletme?: string;
  durum?: string;
  puan?: string;
  vardiya?: string;
  baslangic?: string;
  bitis?: string;
  ara?: string;
  sayfa?: string;
};

/**
 * Liste ekranı ile CSV dışa aktarma aynı filtreyi kullanmalı — aksi halde
 * patron ekranda gördüğünden farklı bir dosya indirir. Bu yüzden filtre
 * kurulumu tek yerde.
 *
 * `allowedIds` her zaman uygulanır: sorumlu, adres çubuğuna başka bir işletme
 * kimliği yazarak kapsam dışına çıkamaz.
 */
export function buildFeedbackWhere(
  query: FeedbackQuery,
  allowedIds: string[],
): Record<string, unknown> {
  const businessFilter =
    query.isletme && allowedIds.includes(query.isletme)
      ? [query.isletme]
      : allowedIds;

  const where: Record<string, unknown> = { businessId: { in: businessFilter } };

  if (query.durum) where.status = query.durum;
  if (query.vardiya) where.shift = query.vardiya;

  if (query.puan === "dusuk") where.overallRating = { lte: 3 };
  else if (query.puan === "yuksek") where.overallRating = { gte: 4 };
  else if (query.puan && /^[1-5]$/.test(query.puan)) {
    where.overallRating = Number(query.puan);
  }

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (query.baslangic) createdAt.gte = new Date(`${query.baslangic}T00:00:00`);
  if (query.bitis) createdAt.lte = new Date(`${query.bitis}T23:59:59`);
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  if (query.ara) {
    // Katlanmış kopya üzerinden ara (Türkçe büyük-küçük harf sorunu için);
    // eski kayıtlarda o alan boş olabileceğinden ham yorumu da tara.
    where.OR = [
      { commentSearch: { contains: foldTr(query.ara) } },
      { comment: { contains: query.ara } },
    ];
  }

  return where;
}

/**
 * Formül olarak yorumlanabilecek hücreleri etkisizleştirir.
 *
 * CSV'deki yorumlar müşteriden geliyor ve Excel `=`, `+`, `-`, `@` ile
 * başlayan hücreyi formül sanıp çalıştırıyor. Yani anketi dolduran herhangi
 * biri, dosyayı açan işletme sahibinin bilgisayarında komut çalıştırabilirdi
 * (`=cmd|'/c ...'!A1` gibi). Başa tek tırnak koymak metni bozmadan bunu
 * keser: Excel tırnağı göstermez, formül de kurmaz.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Excel'in Türkçe yerel ayarda bozulmaması için noktalı virgül ve BOM kullanılır. */
export function toCsv(rows: string[][]): string {
  const escape = (value: string) =>
    `"${neutralizeFormula(value).replace(/"/g, '""')}"`;
  return "﻿" + rows.map((row) => row.map(escape).join(";")).join("\r\n");
}
