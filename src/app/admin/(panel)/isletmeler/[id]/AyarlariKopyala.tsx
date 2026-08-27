"use client";

import { ClipboardList } from "lucide-react";
import { useActionState, useState } from "react";
import { SectionCard } from "@/components/ui";
import { ayarlariKopyala, type FormState } from "../actions";

/**
 * İşletme ayarlarını aynı hesaptaki başka şubelere kopyalar.
 *
 * Menüdeki kopyalama farklı olarak burada hedefte "boş" diye bir kavram
 * yok — ayarlar zaten her işletmede dolu, bu işlem seçilen şubelerin
 * mevcut değerlerinin üstüne yazar. Bu yüzden buton tek adımda değil,
 * TumMenuyuSil'deki gibi önce uyarı gösterip ikinci tıklamada çalışıyor.
 */
export function AyarlariKopyala({
  businessId,
  hedefler,
}: {
  businessId: string;
  hedefler: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    ayarlariKopyala,
    {},
  );
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState<string[]>([]);

  if (hedefler.length === 0) return null;

  return (
    <SectionCard
      ikon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
      renk="sky"
      title="Ayarları başka şubeye kopyala"
      description="Marka rengi, QR kart metni, Wi-Fi, paket sipariş linkleri, logo/kapak, İYS kodu, sosyal medya ve karşılama duyurusu — seçilen şubelerdeki mevcut değerlerin üstüne yazılır. İşletme adı, adresi ve Google yorum linki asla kopyalanmaz, her şubede kendi kalır."
    >
      <fieldset className="flex flex-col gap-2">
        {hedefler.map((h) => (
          <label
            key={h.id}
            className="flex cursor-pointer items-center gap-2 rounded-chip border border-line bg-surface px-3 py-2 text-small text-ink hover:bg-canvas has-checked:border-accent-500 has-checked:bg-accent-50"
          >
            <input
              type="checkbox"
              checked={secili.includes(h.id)}
              onChange={(e) =>
                setSecili((s) =>
                  e.target.checked ? [...s, h.id] : s.filter((x) => x !== h.id),
                )
              }
              className="shrink-0"
            />
            <span className="flex-1">{h.name}</span>
          </label>
        ))}
      </fieldset>

      {!acik ? (
        <button
          type="button"
          disabled={secili.length === 0}
          onClick={() => setAcik(true)}
          className="mt-3 self-start rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Seçilenlere kopyala
        </button>
      ) : (
        <form
          action={formAction}
          className="mt-3 flex flex-col gap-3 rounded-control border border-warning/40 bg-warning-soft px-4 py-4"
        >
          <input type="hidden" name="businessId" value={businessId} />
          {secili.map((id) => (
            <input key={id} type="hidden" name="hedefIds" value={id} />
          ))}
          <p className="text-small text-warning-ink">
            <strong>{secili.length} şubenin</strong> mevcut ayarları bu
            işletmeninkiyle değiştirilecek. Wi-Fi şifresi ve paket sipariş
            linkleri genelde şubeye göre farklıdır — emin değilseniz bu
            kutuyu işaretlemeden önce kontrol edin.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
            >
              {pending ? "Kopyalanıyor…" : "Evet, kopyala"}
            </button>
            <button
              type="button"
              onClick={() => setAcik(false)}
              className="rounded-control border border-line bg-surface px-4 py-2 text-small text-ink-soft transition hover:bg-canvas"
            >
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {state.error ? (
        <p className="mt-3 rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="mt-3 rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          Ayarlar kopyalandı.
        </p>
      ) : null}
    </SectionCard>
  );
}
