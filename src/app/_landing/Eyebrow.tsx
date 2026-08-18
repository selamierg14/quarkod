import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Bölüm başlıklarının üstündeki marka renkli etiket. */
export function Eyebrow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-caption font-semibold text-brand-strong ring-1 ring-brand-line">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}
