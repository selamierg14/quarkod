export { Button, ButtonLink, ButtonRow, Spinner, buttonClass } from "./Button";
export type { ButtonSize, ButtonVariant } from "./Button";
export { Card, CardHeader, Overline, BilgiIpucu, PageHeader, SectionCard } from "./Card";
export type { SayfaRengi } from "./Card";
export { Checkbox, Field, FormFeedback, Input, Select, Textarea } from "./Field";
export { TarihGirdisi } from "./TarihGirdisi";
export { Badge, ScoreBar, Stars, StatusBadge, puanRengi } from "./Badge";
export type { BadgeTone } from "./Badge";
export { StatCard } from "./StatCard";
export { EmptyState } from "./EmptyState";
export { Alert, SystemBanner } from "./Alert";
export type { AlertTone } from "./Alert";
export { TBody, TD, TH, THead, TR, Table, TableShell } from "./Table";
export { ChipLink, Pagination, SegmentGroup, SegmentLink, TabLink } from "./Nav";
export { Skeleton, SkeletonCard, SkeletonRows } from "./Skeleton";
export { ToastProvider, useToast } from "./Toast";
export type { ToastTone } from "./Toast";
export { Dialog } from "./Dialog";
export { KorunanForm } from "./KorunanForm";
export { BasHarfAvatar } from "./BasHarfAvatar";
export { EYLEM_SATIRI, EylemMenusu } from "./EylemMenusu";
export { SifreAlani, sifreUret } from "./SifreAlani";

/**
 * Tarih biçimi tek yerde: liste, detay ve dışa aktarma aynı görünsün.
 *
 * Saat dilimi AÇIKÇA İstanbul: sunucu (instrumentation.ts) ve tarayıcı
 * aynı metni üretsin. Yurt dışındaki bir tarayıcıda istemci bileşeni
 * farklı saat yazsaydı hem hidrasyon uyuşmazlığı hem de ekranda iki ayrı
 * saat olurdu.
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export { GonderDugmesi } from "./GonderDugmesi";
export { SilDugmesi } from "./SilDugmesi";
