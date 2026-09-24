import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { requireUser } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { PageHeader, SectionCard } from "@/components/ui";
import { calisilanDakika, sureMetni } from "@/lib/personel/mesai";
import { OkutmaDugmesi } from "./OkutmaDugmesi";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mesai" };

/**
 * QR'IN AÇTIĞI EKRAN — personelin gördüğü tek sayfa.
 *
 * Mekana asılan karekod buraya geliyor. Personel panele kendi
 * telefonundan girişli olduğu için kim olduğu zaten belli; ekranda tek
 * bir düğme var ve ne yapacağını durumu söylüyor: açık kaydı yoksa
 * "Giriş yap", varsa "Çıkış yap".
 *
 * İki düğme koymak (ayrı giriş / ayrı çıkış) servis sırasında yanlış
 * düğmeye basılmasının en yaygın sebebi; burada yanlış düğme yok.
 *
 * Kapı KULLANICININ modülü değil İŞLETMENİN modülü: okutan kişi garson
 * ve garsona hiç modül dağıtılmıyor (bkz. lib/kimlik/moduller.ts).
 */
export default async function MesaiOkutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const user = await requireUser();
  const { token } = await params;

  const isletme = await prisma.business.findFirst({
    where: { mesaiQrToken: token },
    select: {
      id: true,
      name: true,
      account: { select: { users: { where: { role: "owner" }, select: { moduller: true } } } },
    },
  });
  // Kod yanlışsa ya da hesapta modül yoksa sayfa hiç yok: "modülünüz
  // kapalı" demek, olmayan bir ekranın varlığını duyurmak olurdu.
  if (!isletme || !isletme.account.users.some((u) => u.moduller.includes("mesai"))) {
    notFound();
  }

  const acik = await prisma.mesaiKaydi.findFirst({
    where: { userId: user.id, cikis: null },
    select: { id: true, giris: true },
  });

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const bugunkuler = await prisma.mesaiKaydi.findMany({
    where: { userId: user.id, giris: { gte: bugun } },
    orderBy: { giris: "asc" },
    select: { id: true, userId: true, giris: true, cikis: true },
  });

  const bugunToplam = bugunkuler.reduce(
    (t, k) => t + (calisilanDakika(k) ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<Clock className="h-4 w-4" aria-hidden="true" />}
        renk="emerald"
        title={isletme.name}
        description={`${user.name} · mesai kaydı`}
      />

      <SectionCard title={acik ? "Mesaideyken" : "Mesai başlangıcı"}>
        <div className="flex flex-col items-center gap-4 py-2">
          {acik ? (
            <p className="text-center text-body text-ink-soft">
              Giriş saatiniz{" "}
              <strong className="text-ink">
                {acik.giris.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              . Mesai bitince aynı karekodu okutun.
            </p>
          ) : (
            <p className="text-center text-body text-ink-soft">
              Girişinizi almak için dokunun. Çıkarken de aynı karekodu okutun.
            </p>
          )}

          <OkutmaDugmesi token={token} cikisMi={Boolean(acik)} />

          <p className="text-caption text-ink-faint">
            Kayıt yalnızca işletmenin internet ağındayken alınabiliyor.
          </p>
        </div>
      </SectionCard>

      {bugunkuler.length > 0 ? (
        <SectionCard
          title="Bugün"
          description={`Toplam: ${sureMetni(bugunToplam || null)}`}
        >
          <ul className="flex flex-col gap-1.5">
            {bugunkuler.map((k) => (
              <li key={k.id} className="flex justify-between text-small text-ink-soft">
                <span className="tabular">
                  {k.giris.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {k.cikis
                    ? k.cikis.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                    : "…"}
                </span>
                <span className="text-ink-faint">{sureMetni(calisilanDakika(k))}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
