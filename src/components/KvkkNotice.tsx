import { kvkkNotice } from "@/lib/kvkk";

/** Anket ekranında açılıp kapanan aydınlatma metni. */
export function KvkkNotice({ businessName }: { businessName: string }) {
  const notice = kvkkNotice(businessName);

  return (
    <details className="mt-3 rounded-control bg-canvas text-small">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-ink-soft marker:hidden">
        <span className="underline decoration-line-strong underline-offset-2">
          {notice.title}
        </span>
        <span className="float-right text-ink-faint" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <dl className="space-y-3 px-3 pt-1 pb-4">
        {notice.items.map((item) => (
          <div key={item.heading}>
            <dt className="text-caption font-semibold tracking-wide text-ink-muted uppercase">
              {item.heading}
            </dt>
            <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
              {item.body}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
