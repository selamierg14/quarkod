"use client";

import Link from "next/link";
import { useDil } from "@/components/DilSaglayici";

export type DuyuruKarti = {
  id: string;
  baslik: string;
  aciklama: string | null;
  imageUrl: string | null;
  baslangic: string | null;
  bitis: string | null;
};

export function DuyurularListesi({
  taban,
  duyurular,
}: {
  taban: string;
  duyurular: DuyuruKarti[];
}) {
  const { t } = useDil();

  return (
    <div className="flex flex-col gap-4">
      <Link href={taban} className="self-start text-small text-ink-muted underline underline-offset-2">
        {t("duyurular.geriDon")}
      </Link>

      {duyurular.length === 0 ? (
        <p className="text-center text-small text-ink-muted">{t("duyurular.bosDurum")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {duyurular.map((d) => (
            <li
              key={d.id}
              className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
            >
              {d.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.imageUrl} alt={d.baslik} className="h-40 w-full object-cover" />
              ) : null}
              <div className="p-4">
                <p className="font-semibold text-ink">{d.baslik}</p>
                {d.aciklama ? (
                  <p className="mt-1 text-small text-ink-muted">{d.aciklama}</p>
                ) : null}
                {d.baslangic || d.bitis ? (
                  <p className="mt-2 text-caption text-ink-faint">
                    {d.baslangic ?? ""} {d.baslangic && d.bitis ? "–" : ""} {d.bitis ?? ""}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
