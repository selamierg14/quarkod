import { Crown } from "lucide-react";
import { requireSuperadmin } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { PageHeader, Pagination, SectionCard } from "@/components/ui";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import { plusGecerliMi } from "@/lib/biyerlere/biyerlere-plus";
import { PlusKaldirButonu, PlusYapForm } from "./PlusForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Biyerlere Plus" };

/**
 * Biyerlere Plus üyeliği — superadmin panelinden elle yönetiliyor (bkz.
 * AppUser.plusUyeMi şema yorumu, gerçek ödeme sağlayıcısı yok).
 */
export default async function PlusPage({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string; sayfa?: string; boyut?: string }>;
}) {
  await requireSuperadmin();
  const sorgu = await searchParams;
  const arama = (sorgu.ara ?? "").trim();

  const kosul = arama
    ? {
        OR: [
          { username: { contains: arama, mode: "insensitive" as const } },
          { name: { contains: arama, mode: "insensitive" as const } },
        ],
      }
    : { plusUyeMi: true };

  // Eskiden sabit 30 kayıt: 31. Plus üyesi hiçbir ekranda görünmüyordu.
  const toplam = await prisma.appUser.count({ where: kosul });
  const durum = sayfaDurumu(sorgu, toplam);

  const kullanicilar = await prisma.appUser.findMany({
    where: kosul,
    orderBy: { createdAt: "desc" },
    skip: durum.skip,
    take: durum.take,
    select: { id: true, username: true, name: true, plusUyeMi: true, plusBitis: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<Crown className="h-4 w-4" aria-hidden="true" />}
        renk="amber"
        title="Biyerlere Plus"
        description="Üyelik ₺349/ay vaadiyle satılıyor ama ödeme sağlayıcısı bağlı değil — üyelik burada elle açılıp süresi uzatılıyor."
      />

      <SectionCard
        ikon={<Crown className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="Kullanıcı ara"
        description="Boş bırakılırsa hâlihazırda Plus üyesi olanlar listelenir."
      >
        <form className="flex gap-2">
          <input
            type="search"
            name="ara"
            defaultValue={arama}
            placeholder="Kullanıcı adı ya da ad"
            className="flex-1 rounded-chip border border-line bg-surface px-3 py-2 text-small outline-none focus:border-line-strong"
          />
          <button
            type="submit"
            className="rounded-control border border-line px-4 py-2 text-small font-medium text-ink-soft hover:bg-canvas"
          >
            Ara
          </button>
        </form>

        {kullanicilar.length === 0 ? (
          <p className="mt-4 text-small text-ink-faint">
            {arama ? "Eşleşen kullanıcı yok." : "Şu an Plus üyesi yok."}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {kullanicilar.map((k) => {
              const gecerli = plusGecerliMi(k);
              return (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface p-3 ring-1 ring-line"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{k.name}</p>
                    <p className="text-caption text-ink-faint">
                      @{k.username}
                      {k.plusBitis
                        ? ` · bitiş: ${k.plusBitis.toLocaleDateString("tr-TR")}`
                        : k.plusUyeMi
                          ? " · süresiz"
                          : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {gecerli ? (
                      <span className="rounded-chip bg-success-soft px-2.5 py-1 text-caption font-medium text-success-ink">
                        Plus üyesi
                      </span>
                    ) : null}
                    <PlusYapForm appUserId={k.id} />
                    {k.plusUyeMi ? <PlusKaldirButonu appUserId={k.id} /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      {cubukGosterilsinMi(toplam, durum.boyut) ? (
        <Pagination
          sayfa={durum.sayfa}
          toplamSayfa={toplamSayfa(toplam, durum.boyut)}
          toplamKayit={toplam}
          boyut={durum.boyut}
          aralik={aralikMetni(durum, toplam)}
          href={(s) =>
            `/admin/plus?${new URLSearchParams({
              ...(arama ? { ara: arama } : {}),
              ...(durum.boyut !== 10 ? { boyut: String(durum.boyut) } : {}),
              sayfa: String(s),
            }).toString()}`
          }
        />
      ) : null}
      </SectionCard>
    </div>
  );
}
