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

/** Tarih biçimi tek yerde: liste, detay ve dışa aktarma aynı görünsün. */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
