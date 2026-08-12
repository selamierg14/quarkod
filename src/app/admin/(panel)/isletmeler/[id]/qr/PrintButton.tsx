"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white"
    >
      Yazdır (masa standı)
    </button>
  );
}
