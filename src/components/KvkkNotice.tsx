import { kvkkNotice } from "@/lib/kvkk";

/** Anket ekranında açılıp kapanan aydınlatma metni. */
export function KvkkNotice({ businessName }: { businessName: string }) {
  const notice = kvkkNotice(businessName);

  return (
    <details className="mt-3 rounded-xl bg-slate-50 text-sm">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-slate-600 marker:hidden">
        <span className="underline decoration-slate-300 underline-offset-2">
          {notice.title}
        </span>
        <span className="float-right text-slate-400" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <dl className="space-y-3 px-3 pt-1 pb-4">
        {notice.items.map((item) => (
          <div key={item.heading}>
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {item.heading}
            </dt>
            <dd className="mt-0.5 text-[13px] leading-relaxed text-slate-600">
              {item.body}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
