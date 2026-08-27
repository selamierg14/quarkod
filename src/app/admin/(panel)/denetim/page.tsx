import { Check } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROL_ADLARI } from "@/lib/constants";
import { effectiveAccountId } from "@/lib/impersonation";
import { EYLEM_METNI, denetimKapsami, type DenetimEylemi } from "@/lib/denetim";
import {
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  SegmentGroup,
  SegmentLink,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableShell,
  formatDateTime,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "İşlem geçmişi" };

const SAYFA_BOYU = 50;

const ORTAK_SUZGECLER = [
  { deger: "", etiket: "Tümü" },
  { deger: "feedback", etiket: "Geri bildirim" },
  { deger: "menu", etiket: "Menü" },
  { deger: "user", etiket: "Kullanıcı" },
];

/** "Bizim ekip ne yaptı" sorusu yalnızca platform tarafında sorulur. */
const PLATFORM_SUZGECI = { deger: "platform", etiket: "Platform ekibi" };

export default async function DenetimPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; sayfa?: string }>;
}) {
  // Hesap sahibi kendi kiracısının kaydını görür; platform yöneticisi hepsini.
  const user = await requireOwner();
  const query = await searchParams;
  const aktifHesap = await effectiveAccountId(user);
  const platformGorunumu = user.role === "superadmin" && !aktifHesap;

  const kapsam = denetimKapsami(user.role, aktifHesap, user.accountId);

  const suzgecler = platformGorunumu
    ? [ORTAK_SUZGECLER[0], PLATFORM_SUZGECI, ...ORTAK_SUZGECLER.slice(1)]
    : ORTAK_SUZGECLER;

  const tur = suzgecler.some((s) => s.deger === query.tur) ? (query.tur ?? "") : "";
  const turFiltresi =
    tur === "platform"
      ? { actorRole: "superadmin" }
      : tur
        ? { action: { startsWith: `${tur}.` } }
        : {};

  const sayfa = Math.max(1, Number(query.sayfa ?? "1") || 1);
  const where = { ...kapsam, ...turFiltresi };

  const [toplam, kayitlar] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (sayfa - 1) * SAYFA_BOYU,
      take: SAYFA_BOYU,
    }),
  ]);

  const adres = (yeni: Record<string, string>) => {
    const p = new URLSearchParams();
    if (tur) p.set("tur", tur);
    for (const [k, v] of Object.entries(yeni)) {
      if (v) p.set(k, v);
    }
    const q = p.toString();
    return q ? `/admin/denetim?${q}` : "/admin/denetim";
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={platformGorunumu ? "Denetim kaydı" : "İşlem geçmişi"}
        description={
          platformGorunumu
            ? "Tüm hesaplardaki işlemler ve platform ekibinin kendi hareketleri. Kayıtlar silinemez."
            : "Ekibinizin panelde yaptığı her değişiklik. Kayıtlar silinemez."
        }
      />

      <SegmentGroup label="Kayıt türü">
        {suzgecler.map((s) => (
          <SegmentLink
            key={s.deger || "tumu"}
            href={s.deger ? `/admin/denetim?tur=${s.deger}` : "/admin/denetim"}
            active={tur === s.deger}
          >
            {s.etiket}
          </SegmentLink>
        ))}
      </SegmentGroup>

      {kayitlar.length === 0 ? (
        <EmptyState baslik="Kayıt yok" ikon={<Check className="h-4 w-4" aria-hidden="true" />}>
          Bu süzgeçte hiçbir işlem yok. Panelde bir değişiklik yapıldığında
          burada satır olarak belirir.
        </EmptyState>
      ) : (
        <>
          <TableShell>
            <Table>
              <THead>
                <TR>
                  <TH>Zaman</TH>
                  <TH>Kim</TH>
                  <TH>İşlem</TH>
                  <TH>Ayrıntı</TH>
                </TR>
              </THead>
              <TBody>
                {kayitlar.map((k) => (
                  <TR key={k.id} vurgu={k.action.startsWith("account.enter")}>
                    <TD className="whitespace-nowrap text-ink-muted">
                      {formatDateTime(k.createdAt)}
                    </TD>
                    <TD>
                      <span className="font-medium text-ink">{k.actorName}</span>
                      <span className="ml-2 text-caption text-ink-faint">
                        {ROL_ADLARI[k.actorRole] ?? k.actorRole}
                      </span>
                    </TD>
                    <TD>
                      <Badge
                        tone={k.actorRole === "superadmin" ? "uyari" : "notr"}
                      >
                        {EYLEM_METNI[k.action as DenetimEylemi] ?? k.action}
                      </Badge>
                    </TD>
                    <TD className="text-ink">{k.detail ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableShell>

          <Pagination
            sayfa={sayfa}
            toplamSayfa={Math.max(1, Math.ceil(toplam / SAYFA_BOYU))}
            toplamKayit={toplam}
            href={(s) => adres({ sayfa: String(s) })}
          />
        </>
      )}
    </div>
  );
}
