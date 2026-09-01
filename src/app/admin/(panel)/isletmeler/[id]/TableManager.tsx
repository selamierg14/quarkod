"use client";

import { useActionState } from "react";
import { addTables, toggleTable, tumMasalariAc, tumMasalariKapat, type FormState } from "../actions";

type TableRow = {
  id: string;
  tableNumber: string;
  isEntrance: boolean;
  active: boolean;
};

export function TableManager({
  businessId,
  tables,
}: {
  businessId: string;
  tables: TableRow[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addTables,
    {},
  );

  const acikSayisi = tables.filter((t) => t.active).length;
  const kapaliSayisi = tables.length - acikSayisi;

  return (
    <div className="flex flex-col gap-3">
      {tables.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <span>
            {acikSayisi} açık{kapaliSayisi > 0 ? `, ${kapaliSayisi} kapalı` : ""}
          </span>
          <span className="text-ink-faint">·</span>
          {/* Toplu işlemler: onlarca masası olan bir işletme için tek tek
              kapatmak kullanılamaz hale gelirdi. Silme değil — aynı toggle
              mekanizması, isterse toplu geri açılabilir. */}
          {acikSayisi > 0 ? (
            <form action={tumMasalariKapat}>
              <input type="hidden" name="businessId" value={businessId} />
              <button
                type="submit"
                className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
              >
                Tümünü kapat
              </button>
            </form>
          ) : null}
          {kapaliSayisi > 0 ? (
            <form action={tumMasalariAc}>
              <input type="hidden" name="businessId" value={businessId} />
              <button
                type="submit"
                className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
              >
                Tümünü aç
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tables.map((table) => (
          <form key={table.id} action={toggleTable}>
            <input type="hidden" name="tableId" value={table.id} />
            <button
              type="submit"
              title={table.active ? "Kapat" : "Aç"}
              className={`
                rounded-chip px-3 py-1.5 text-small ring-1 transition
                ${
                  table.active
                    ? "bg-surface text-ink-soft ring-line hover:ring-line-strong"
                    : "bg-sunken text-ink-faint line-through ring-line"
                }
              `}
            >
              {table.isEntrance ? "Giriş" : table.tableNumber}
            </button>
          </form>
        ))}
        {tables.length === 0 ? (
          <p className="text-small text-ink-muted">Henüz masa yok — aşağıdan ekleyin.</p>
        ) : null}
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-2 border-t border-line pt-3"
      >
        <input type="hidden" name="businessId" value={businessId} />
        <div className="flex gap-2">
          <input
            name="tableNumbers"
            required
            placeholder='"1-20" veya "VIP-1, VIP-2, Teras"'
            className="flex-1 rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-chip bg-accent-600 px-4 py-2 text-small font-medium text-white transition hover:bg-accent-700 disabled:bg-slate-400"
          >
            Ekle
          </button>
        </div>
        <p className="text-caption text-ink-muted">
          Aralık girin (<code className="rounded bg-sunken px-1 py-0.5">1-20</code>)
          ya da virgülle ayırıp isim verin
          (<code className="rounded bg-sunken px-1 py-0.5">VIP-1, Teras, Bahçe 3</code>).
          Tek seferde en fazla 300 masa.
        </p>
      </form>

      {state.error ? (
        <p className="rounded-chip bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-chip bg-success-soft px-3 py-2 text-small text-success-ink">
          Eklendi.
        </p>
      ) : null}
    </div>
  );
}
