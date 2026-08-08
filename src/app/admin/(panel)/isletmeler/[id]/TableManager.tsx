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
                rounded-lg px-3 py-1.5 text-sm ring-1 transition
                ${
                  table.active
                    ? "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"
                    : "bg-slate-100 text-slate-400 line-through ring-slate-200"
                }
              `}
            >
              {table.isEntrance ? "Giriş" : table.tableNumber}
            </button>
          </form>
        ))}
        {tables.length === 0 ? (
          <p className="text-sm text-slate-400">Henüz masa tanımlanmamış.</p>
        ) : null}
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-2 border-t border-slate-100 pt-3"
      >
        <input type="hidden" name="businessId" value={businessId} />
        <div className="flex gap-2">
          <input
            name="tableNumbers"
            required
            placeholder='"1-20" veya "VIP-1, VIP-2, Teras"'
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
          >
            Ekle
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="isEntrance" className="h-4 w-4" />
          Giriş/kapı QR&apos;ı olarak ekle (masa numarası göstermez)
        </label>
      </form>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Eklendi.
        </p>
      ) : null}
    </div>
  );
}
