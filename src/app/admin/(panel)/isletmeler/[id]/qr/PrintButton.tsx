"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-control bg-accent-600 px-4 py-2.5 text-small font-medium text-white transition hover:bg-accent-700"
    >
      Yazdır (masa standı)
    </button>
  );
}
