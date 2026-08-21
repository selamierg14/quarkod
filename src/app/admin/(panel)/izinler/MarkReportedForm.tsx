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
        className="rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink-soft hover:bg-canvas"
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
        className="w-52 rounded-chip border border-line px-3 py-1.5 text-small outline-none focus:border-line-strong"
      />
      <button
        type="submit"
        className="rounded-chip bg-accent-600 px-3 py-1.5 text-small font-medium text-white transition hover:bg-accent-700"
      >
        {bekleyen} kaydı işaretle
      </button>
      <button
        type="button"
        onClick={() => setAcik(false)}
        className="rounded-chip border border-line px-3 py-1.5 text-small text-ink-muted"
      >
        Vazgeç
      </button>
    </form>
  );
}
