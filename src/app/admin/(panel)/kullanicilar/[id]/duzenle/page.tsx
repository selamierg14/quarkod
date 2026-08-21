import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner, userScope, visibleBusinesses } from "@/lib/auth";
import { EditUserForm } from "../../UserForms";
import { acilabilirRoller } from "@/lib/panel";
import { PageHeader, SectionCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kullanıcı düzenle" };

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const owner = await requireOwner();
  const { id } = await params;

  const [target, businesses] = await Promise.all([
    prisma.user.findFirst({
      where: { id, ...await userScope(owner) },
      include: { businesses: { select: { businessId: true } } },
    }),
    visibleBusinesses(owner),
  ]);

  if (!target) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/kullanicilar"
        className="inline-flex w-fit items-center gap-1.5 self-start rounded-control border border-line bg-surface px-3 py-1.5 text-small font-medium text-ink-soft shadow-card transition hover:-translate-y-0.5 hover:border-line-strong hover:text-ink"
      >
        <span aria-hidden="true">←</span>
        Kullanıcı listesine dön
      </Link>

      <PageHeader
        ikon="✏️"
        renk="indigo"
        title={`${target.name} — düzenle`}
        description="Rolü, bağlı işletmesi ve modül izinleri. Değişiklik bir sonraki girişinde geçerli olur."
      />

      <SectionCard
        className="max-w-2xl"
        ikon="🧑"
        renk="indigo"
        title="Kullanıcı bilgileri"
        description="Şifre buradan değişmez; kullanıcı kendi profilinden değiştirir."
      >
        {target.id === owner.id ? (
          <p className="rounded-chip bg-warning-soft px-3 py-2 text-small text-warning-ink">
            Kendi kaydınızı buradan düzenleyemezsiniz. Bilgilerinizi Profil
            sayfasından değiştirin.
          </p>
        ) : (
          <EditUserForm
            user={{
              id: target.id,
              name: target.name,
              email: target.email,
              username: target.username,
              phone: target.phone,
              role: target.role,
              businessId: target.businessId,
              bolgeIsletmeleri: target.businesses.map((b) => b.businessId),
              menuIzni: target.menuIzni,
              anketIzni: target.anketIzni,
            }}
            businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
            roller={acilabilirRoller(owner.role)}
          />
        )}
      </SectionCard>
    </div>
  );
}
