import { Coffee, Fish, Martini } from "lucide-react";

const TIPLER = [
  { icon: Coffee, label: "Kafe & Restoran" },
  { icon: Fish, label: "Balıkçı" },
  { icon: Martini, label: "Gece Kulübü" },
];

export function BusinessTypes() {
  return (
    <section className="border-y border-line bg-surface py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-3 px-5">
        <span className="text-caption font-semibold tracking-wide text-ink-faint uppercase">
          Her işletme tipine uygun
        </span>
        {TIPLER.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-small font-medium text-brand-strong ring-1 ring-brand-line"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
