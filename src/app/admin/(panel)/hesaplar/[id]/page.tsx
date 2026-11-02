import { notFound } from "next/navigation";
import { FolderOpen, Store, Users } from "lucide-react";
import { requireSuperadmin } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { getActiveAccountId } from "@/lib/kimlik/impersonation";
import { BUSINESS_TYPES, type BusinessType, ROL_ADLARI } from "@/lib/cekirdek/constants";
import { MODUL_ANAHTARLARI } from "@/lib/kimlik/moduller";
import { hesapAktifMi, kalanGun } from "@/lib/isletme/abonelik";
import { PageHeader, SectionCard, formatDateTime } from "@/components/ui";
import { EnterAccountButton, SubscriptionForm, ToggleAccountButton } from "../AccountForms";
import { SorumluListesi } from "../SorumluListesi";
import { HesapDurumRozeti } from "../HesapDurumRozeti";

export const dynamic = "force-dynamic";

export const metadata = { title: "Hesap" };

/** date input'unun beklediği yyyy-aa-gg; yerel saate göre. */
function dateInputValue(tarih: Date | null): string {
  if (!tarih) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${tarih.getFullYear()}-${p(tarih.getMonth() + 1)}-${p(tarih.getDate())}`;
}

/**
 * Tek bir müşteri hesabının ayrıntısı.
 *
 * Önceden bütün bunlar liste sayfasında, her hesap için ~250px'lik bir
 * kartın içindeydi: ekrana üç hesap sığıyordu ve aranacak bir şey yoktu
 * (UI incelemesi). Liste artık tablo; abonelik, modül dağıtımı, sahipler
 * ve işletme ağacı burada.
 */
export default async function HesapDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSuperadmin();
  const { id } = await params;

  const [account, aktifHesap] = await Promise.all([
    prisma.account.findUnique({
      where: { id },
      include: {
        businesses: {
          orderBy: { createdAt: "asc" },
          include: {
            users: { select: { id: true, name: true, username: true, active: true } },
            _count: { select: { feedbacks: true, tables: true } },
          },
        },
        users: {
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
            businessId: true,
            moduller: true,
          },
        },
      },
    }),
    getActiveAccountId(user),
  ]);
  if (!account) notFound();

  const sahipler = account.users.filter((u) => !u.businessId);
  const calisiyor = hesapAktifMi(account);
  const gun = kalanGun(account);
  // Modüller hesabın sahiplerinde duruyor (bkz. hesaplar/actions.ts).
  const sahipModulleri = sahipler[0]?.moduller ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        ikon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
        title={account.name}
        description={`${account.businesses.length} işletme · ${account.users.length} kullanıcı · açılış ${formatDateTime(account.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <HesapDurumRozeti active={account.active} calisiyor={calisiyor} gun={gun} />
            {aktifHesap === account.id ? (
              <span className="rounded-chip bg-ink px-2 py-0.5 text-caption font-medium text-white">
                görüntüleniyor
              </span>
            ) : (
              <EnterAccountButton accountId={account.id} active={calisiyor} etiket="Bu hesabı görüntüle" />
            )}
            <ToggleAccountButton accountId={account.id} active={account.active} />
          </div>
        }
      />

      <SectionCard title="Abonelik ve modüller" padded={false}>
        <SubscriptionForm
          accountId={account.id}
          expiresAt={dateInputValue(account.expiresAt)}
          moduller={sahipModulleri}
          iysCode={account.iysCode ?? ""}
        />
        <p className="border-t border-line px-4 py-2 text-caption text-ink-faint">
          {sahipModulleri.filter((m) => (MODUL_ANAHTARLARI as string[]).includes(m)).length}/
          {MODUL_ANAHTARLARI.length} modül açık. Hesap sahibi açık modülleri kendi ekibine
          dağıtabilir; burada kapatılan modülü hiç kimse kullanamaz.
        </p>
      </SectionCard>

      <SectionCard
        ikon={<Users className="h-4 w-4" aria-hidden="true" />}
        title="Hesap sahipleri"
      >
        <SorumluListesi
          kisiler={sahipler.map((u) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            active: u.active,
            rol: ROL_ADLARI[u.role] ?? u.role,
          }))}
          etiket="Sahip"
          bosMesaj="Sahip yok — bu hesaba kimse giremez."
        />
      </SectionCard>

      <SectionCard
        ikon={<Store className="h-4 w-4" aria-hidden="true" />}
        title={`İşletmeler (${account.businesses.length})`}
        padded={false}
      >
        {account.businesses.length === 0 ? (
          <p className="px-4 py-3 text-small text-ink-faint">Henüz işletme eklenmemiş.</p>
        ) : (
          <ul className="divide-y divide-line">
            {account.businesses.map((business) => (
              <li key={business.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: business.brandColor }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{business.name}</span>
                    <code className="rounded bg-sunken px-1 text-caption text-ink-muted">
                      /f/{business.slug}
                    </code>
                  </span>
                  <p className="mt-0.5 text-caption text-ink-faint">
                    {BUSINESS_TYPES[business.type as BusinessType] ?? business.type} ·{" "}
                    {business._count.tables} QR · {business._count.feedbacks} geri bildirim
                  </p>
                  <SorumluListesi
                    kisiler={business.users.map((u) => ({
                      id: u.id,
                      name: u.name,
                      username: u.username,
                      active: u.active,
                    }))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
