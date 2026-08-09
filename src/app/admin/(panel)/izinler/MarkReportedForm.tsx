"use client";

import { useState } from "react";
import { markReported } from "./actions";

export function MarkReportedForm({ bekleyen }: { bekleyen: number }) {
  const [acik, setAcik] = useState(false);

  if (bekleyen === 0) return null;

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        Bildirildi olarak işaretle
      </button>
    );
  }

  return (
    <form action={markReported} className="flex flex-wrap items-center gap-2">
      <input
        name="transactionId"
        placeholder="İYS işlem no (isteğe bağlı)"
        className="w-52 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
      >
        {bekleyen} kaydı işaretle
      </button>
      <button
        type="button"
        onClick={() => setAcik(false)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500"
      >
        Vazgeç
      </button>
    </form>
  );
}
