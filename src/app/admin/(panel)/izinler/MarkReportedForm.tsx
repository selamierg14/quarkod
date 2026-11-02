"use client";

import { useState } from "react";
import { markReported } from "./actions";
import { buttonClass } from "@/components/ui";

export function MarkReportedForm({ bekleyen }: { bekleyen: number }) {
  const [acik, setAcik] = useState(false);

  if (bekleyen === 0) return null;

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className={buttonClass({ variant: "secondary", size: "sm" })}
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
        className="w-52 rounded-chip border border-line px-3 py-1.5 text-small outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
      />
      <button
        type="submit"
        className={buttonClass({ size: "sm" })}
      >
        {bekleyen} kaydı işaretle
      </button>
      <button
        type="button"
        onClick={() => setAcik(false)}
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        Vazgeç
      </button>
    </form>
  );
}
