import Link from "next/link";
import { FolderOpen, Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireSuperadmin } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import { getActiveAccountId } from "@/lib/kimlik/impersonation";
import { EmptyState, PageHeader, Pagination, buttonClass } from "@/components/ui";
import { EnterAccountButton, NewAccountForm } from "./AccountForms";
import { HesapDurumRozeti } from "./HesapDurumRozeti";
import { MODULLER, MODUL_ANAHTARLARI, type ModulAnahtari } from "@/lib/kimlik/moduller";
import { hesapAktifMi, kalanGun } from "@/lib/isletme/abonelik";

export const dynamic = "force-dynamic";

export const metadata = { title: "Hesaplar" };

const DURUMLAR = {
  aktif: "Aktif",
  dolmus: "Süresi dolmuş",
  askida: "Askıda",
  sahipsiz: "Sahibi yok",
} as const;
type Durum = keyof typeof DURUMLAR;

/**
 * Müşteri hesapları — TABLO.
 *
 * Önceden her hesap ~250px'lik bir kart, içinde abonelik formu, modül
 * kutucukları, sahipler ve işletme ağacıydı: ekrana üç hesap sığıyordu,
 * arama yoktu, her kartta aynı dolu mor "Bu hesabı görüntüle" düğmesi
 * tekrar ediyordu (UI incelemesi). Ayrıntılar artık hesabın kendi
 * sayfasında (hesaplar/[id]); burası tarama ve geçiş ekranı.
 */
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string; boyut?: string; q?: string; durum?: string; yeni?: string }>;
}) {
  const user = await requireSuperadmin();
  const sorgu = await searchParams;
  const aktifHesap = await getActiveAccountId(user);

  const q = (sorgu.q ?? "").trim().slice(0, 80);
  const durumFiltresi = (Object.keys(DURUMLAR) as Durum[]).find((d) => d === sorgu.durum) ?? null;
  const simdi = new Date();

  const kosul: Prisma.AccountWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(durumFiltresi === "aktif"
      ? { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }] }
      : durumFiltresi === "dolmus"
        ? { active: true, expiresAt: { lte: simdi } }
        : durumFiltresi === "askida"
          ? { active: false }
          : durumFiltresi === "sahipsiz"
            ? { active: true, users: { none: { role: "owner", active: true } } }
            : {}),
  };

  const toplam = await prisma.account.count({ where: kosul });
  const durum = sayfaDurumu(sorgu, toplam);

  const accounts = await prisma.account.findMany({
    where: kosul,
    orderBy: { createdAt: "desc" },
    skip: durum.skip,
    take: durum.take,
    select: {
      id: true,
      name: true,
      active: true,
      expiresAt: true,
      createdAt: true,
      _count: { select: { businesses: true, users: true } },
      // Modüller hesabın sahibinde duruyor; sahip yoksa hesap girilemez.
      users: {
        where: { role: "owner" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { name: true, moduller: true, active: true },
      },
    },
  });

  const adres = (degisiklik: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (durumFiltresi) p.set("durum", durumFiltresi);
    if (durum.boyut !== 10) p.set("boyut", String(durum.boyut));
    if (sorgu.yeni) p.set("yeni", "1");
    for (const [k, v] of Object.entries(degisiklik)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const m = p.toString();
    return m ? `/admin/hesaplar?${m}` : "/admin/hesaplar";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        ikon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
        title="Hesaplar"
        description="Sistemi kullanan müşteriler. Bir hesabı görüntülediğinizde panel o müşterinin gördüğü hâle gelir."
        action={
          sorgu.yeni ? null : (
            <Link href={adres({ yeni: "1" })} className={buttonClass({ size: "sm" })}>
              + Yeni hesap
            </Link>
          )
        }
      />

      {/* Form başlığın altında tam genişlikte açılıyor; sağdaki dar eylem
          alanına sığmıyordu. */}
      {sorgu.yeni ? <NewAccountForm acikBasla /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <form method="get" className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          {durumFiltresi ? <input type="hidden" name="durum" value={durumFiltresi} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Hesap adı ara"
            aria-label="Hesap adı ara"
            className="h-8 w-full rounded-control border border-line bg-surface pr-3 pl-8 text-small text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-600"
          />
        </form>
        <nav aria-label="Duruma göre" className="flex flex-wrap gap-1">
          <DurumLinki href={adres({ durum: null, sayfa: null })} aktif={!durumFiltresi}>
            Hepsi
          </DurumLinki>
          {(Object.keys(DURUMLAR) as Durum[]).map((d) => (
            <DurumLinki key={d} href={adres({ durum: d, sayfa: null })} aktif={durumFiltresi === d}>
              {DURUMLAR[d]}
            </DurumLinki>
          ))}
        </nav>
      </div>

      {accounts.length === 0 ? (
        <EmptyState baslik={q || durumFiltresi ? "Bu filtreye uyan hesap yok" : "Henüz hesap yok"}>
          {q || durumFiltresi ? "Aramayı ya da durum filtresini değiştirin." : "İlk müşteri hesabını sağ üstten açın."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
          <p className="border-b border-line px-4 py-2 text-caption text-ink-muted">
            {q || durumFiltresi ? `${toplam} sonuç bulundu` : `${toplam} hesap`}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead className="border-b border-line text-left text-small font-semibold text-ink">
                <tr>
                  <th className="px-4 py-2">Hesap</th>
                  <th className="hidden px-4 py-2 text-right sm:table-cell">İşletme</th>
                  <th className="hidden px-4 py-2 text-right md:table-cell">Kullanıcı</th>
                  <th className="hidden px-4 py-2 md:table-cell">Modüller</th>
                  <th className="px-4 py-2">Abonelik bitişi</th>
                  <th className="px-4 py-2">Durum</th>
                  <th className="sticky right-0 bg-sunken px-4 py-2">
                    <span className="sr-only">İşlemler</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {accounts.map((a) => {
                  const sahip = a.users[0];
                  const acik = (sahip?.moduller ?? []).filter((m): m is ModulAnahtari =>
                    (MODUL_ANAHTARLARI as string[]).includes(m),
                  );
                  const calisiyor = hesapAktifMi(a);
                  const gun = kalanGun(a);
                  const goruntuleniyor = aktifHesap === a.id;
                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors hover:bg-sunken/50 ${goruntuleniyor ? "bg-accent-50/60" : ""}`}
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/hesaplar/${a.id}`}
                          className="font-medium text-ink hover:text-accent-700 hover:underline"
                        >
                          {a.name}
                        </Link>
                        <span className="block text-caption text-ink-faint">
                          {sahip ? (
                            sahip.name
                          ) : (
                            <span className="font-medium text-warning-ink">Sahibi yok</span>
                          )}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2 text-right tabular text-ink-soft sm:table-cell">
                        {a._count.businesses}
                      </td>
                      <td className="hidden px-4 py-2 text-right tabular text-ink-soft md:table-cell">
                        {a._count.users}
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        {/* "2/6 modül" açıklamasızdı (UI incelemesi): hangileri
                            olduğu üzerine gelince görünüyor. */}
                        <span
                          className="rounded-chip bg-sunken px-2 py-0.5 text-caption text-ink-soft tabular"
                          title={acik.length ? acik.map((m) => MODULLER[m]).join(", ") : "Hiç modül açık değil"}
                        >
                          {acik.length}/{MODUL_ANAHTARLARI.length} açık
                        </span>
                      </td>
                      <td className="px-4 py-2 text-ink-soft">
                        {a.expiresAt ? (
                          <span className="tabular">{a.expiresAt.toLocaleDateString("tr-TR")}</span>
                        ) : (
                          <span title="Bitiş tarihi tanımlanmamış; elle askıya alınana kadar çalışır">
                            Süresiz
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <HesapDurumRozeti active={a.active} calisiyor={calisiyor} gun={gun} />
                      </td>
                      <td className="sticky right-0 bg-surface px-4 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {goruntuleniyor ? (
                            <span className="text-caption font-medium text-accent-700">
                              görüntüleniyor
                            </span>
                          ) : (
                            <EnterAccountButton accountId={a.id} active={calisiyor} />
                          )}
                          <Link
                            href={`/admin/hesaplar/${a.id}`}
                            className="rounded-control px-2 py-1 text-caption font-medium text-ink-muted hover:bg-sunken hover:text-ink"
                          >
                            Ayrıntı
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cubukGosterilsinMi(toplam, durum.boyut) ? (
        <Pagination
          sayfa={durum.sayfa}
          toplamSayfa={toplamSayfa(toplam, durum.boyut)}
          toplamKayit={toplam}
          boyut={durum.boyut}
          aralik={aralikMetni(durum, toplam)}
          href={(s) => adres({ sayfa: String(s) })}
        />
      ) : null}
    </div>
  );
}

function DurumLinki({
  href,
  aktif,
  children,
}: {
  href: string;
  aktif: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={aktif ? "page" : undefined}
      className={`rounded-chip px-2.5 py-1 text-caption font-medium transition ${
        aktif ? "bg-ink text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-sunken"
      }`}
    >
      {children}
    </Link>
  );
}
