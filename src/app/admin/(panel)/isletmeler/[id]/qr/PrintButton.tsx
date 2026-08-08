"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
    >
      Yazdır (masa standı)
    </button>
  );
}
