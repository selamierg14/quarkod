"use client";

import { useActionState } from "react";
import { addTables, toggleTable, type FormState } from "../actions";

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

  return (
    <div className="flex flex-col gap-3">
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
          <p className="text-small text-ink-faint">Henüz masa tanımlanmamış.</p>
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
            className="rounded-chip bg-ink px-4 py-2 text-small font-medium text-white disabled:bg-slate-400"
          >
            Ekle
          </button>
        </div>
        <label className="flex items-center gap-2 text-small text-ink-soft">
          <input type="checkbox" name="isEntrance" className="h-4 w-4" />
          Giriş/kapı QR&apos;ı olarak ekle (masa numarası göstermez)
        </label>
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
