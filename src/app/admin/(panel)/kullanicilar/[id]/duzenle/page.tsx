import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner, userScope, visibleBusinesses } from "@/lib/auth";
import { EditUserForm } from "../../UserForms";
import { acilabilirRoller } from "@/lib/panel";

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
      <div className="flex items-center gap-3">
        <Link
          href="/admin/kullanicilar"
          className="rounded-chip border border-line px-2.5 py-1.5 text-small text-ink-soft hover:bg-canvas"
        >
          ← Listeye dön
        </Link>
        <h1 className="text-title font-semibold">{target.name} — düzenle</h1>
      </div>

      <div className="max-w-2xl rounded-control bg-surface p-5 ring-1 ring-line">
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
      </div>
    </div>
  );
}
