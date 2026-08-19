import Link from "next/link";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

type Adim = { baslik: string; tamam: boolean; href: string; aksiyon: string };

/**
 * Yeni hesap boş bir panelle karşılaşıyordu — ne yapacağını tahmin etmesi
 * gerekiyordu. Bu kart gerçek veriden hesaplanır (ayrı bir "tamamlandı"
 * bayrağı tutmuyoruz): dört şart da sağlanınca kendiliğinden kaybolur.
 */
export async function OnboardingKarti({
  user,
  businesses,
}: {
  user: SessionUser;
  businesses: { id: string }[];
}) {
  // Yalnızca kurabilecek roller görsün; viewer zaten değiştiremez, garson
  // buraya hiç gelmiyor.
  if (!["owner", "manager", "bolge", "superadmin"].includes(user.role)) return null;
  if (businesses.length === 0) {
    // İşletmesi olmayan bir hesapta diğer adımların hiçbiri sorgulanamaz.
    return (
      <OnboardingGovde
        adimlar={[
          {
            baslik: "İlk işletmenizi ekleyin",
            tamam: false,
            href: "/admin/isletmeler",
            aksiyon: "İşletme ekle",
          },
        ]}
      />
    );
  }

  const ids = businesses.map((b) => b.id);
  const [masaSayisi, kategoriSayisi, ekstraKullanici] = await Promise.all([
    prisma.table.count({ where: { businessId: { in: ids }, active: true } }),
    prisma.categoryTemplate.count({ where: { businessId: { in: ids }, active: true } }),
    prisma.user.count({
      where: {
        accountId: user.accountId,
        active: true,
        id: { not: user.id },
      },
    }),
  ]);

  const tekIsletme = businesses.length === 1 ? businesses[0].id : null;

  const adimlar: Adim[] = [
    {
      baslik: "QR kodlarını üretip masalara yerleştirin",
      tamam: masaSayisi > 0,
      href: tekIsletme ? `/admin/isletmeler/${tekIsletme}/qr` : "/admin/isletmeler",
      aksiyon: "QR üret",
    },
    {
      baslik: "Anket kategorilerini gözden geçirin",
      tamam: kategoriSayisi > 0,
      href: tekIsletme ? `/admin/isletmeler/${tekIsletme}` : "/admin/isletmeler",
      aksiyon: "Kategorileri düzenle",
    },
    {
      baslik: "Ekibinizden ilk kişiyi ekleyin",
      tamam: ekstraKullanici > 0,
      href: "/admin/kullanicilar/ekle",
      aksiyon: "Kullanıcı ekle",
    },
  ];

  if (adimlar.every((a) => a.tamam)) return null;

  return <OnboardingGovde adimlar={adimlar} />;
}

function OnboardingGovde({ adimlar }: { adimlar: Adim[] }) {
  const tamamlanan = adimlar.filter((a) => a.tamam).length;

  return (
    <section className="rounded-control bg-gradient-to-br from-sky-50 to-violet-50 p-5 ring-1 ring-sky-200">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold text-ink">Kuruluma devam edin</h2>
        <span className="text-caption text-ink-muted">
          {tamamlanan}/{adimlar.length} tamamlandı
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {adimlar.map((adim) => (
          <li
            key={adim.baslik}
            className="flex flex-wrap items-center justify-between gap-2 rounded-chip bg-white/70 px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-small">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  adim.tamam ? "bg-success text-white" : "border-2 border-line-strong"
                }`}
              >
                {adim.tamam ? "✓" : ""}
              </span>
              <span className={adim.tamam ? "text-ink-muted line-through" : "text-ink"}>
                {adim.baslik}
              </span>
            </span>
            {!adim.tamam ? (
              <Link
                href={adim.href}
                className="rounded-chip bg-ink px-3 py-1 text-caption font-medium text-white hover:bg-ink-button-hover"
              >
                {adim.aksiyon}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
