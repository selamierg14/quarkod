import { Plus, User } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { actingAccountId, requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { NewUserForm } from "../UserForms";
import { acilabilirRoller } from "@/lib/panel";
import { PageHeader, SectionCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yeni kullanıcı" };

export default async function NewUserPage() {
  const owner = await requirePersonelYonetimi();
  const businesses = await visibleBusinesses(owner);

  // Yeni kullanıcının açılacağı hesap: platform yöneticisi için "girilen"
  // hesap, diğerleri için kendi hesabı.
  const hedefHesapId = await actingAccountId(owner);
  const hedefHesap = hedefHesapId
    ? await prisma.account.findUnique({
        where: { id: hedefHesapId },
        select: { name: true },
      })
    : null;

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
        ikon={<Plus className="h-4 w-4" aria-hidden="true" />}
        renk="emerald"
        title="Yeni kullanıcı"
        description="Rol, hangi ekranları göreceğini belirler. QR menü ve QR değerlendirme izinleri ayrı ayrı verilir."
      />

      <SectionCard
        className="max-w-2xl"
        ikon={<User className="h-4 w-4" aria-hidden="true" />}
        renk="emerald"
        title="Kullanıcı bilgileri"
        description="Rol seçimine göre alttaki alanlar değişir."
      >
        <NewUserForm
          businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
          roller={acilabilirRoller(owner.role)}
          hint={
            // "Hangi kafeye kullanıcı açıyorum?" sorusu formun en kritik ama
            // en görünmez parçasıydı: kullanıcı her zaman içinde bulunulan
            // hesaba açılır ve o hesabın TÜM işletmelerini görür.
            hedefHesap ? (
              <>
                Bu kullanıcı{" "}
                <span className="font-medium text-ink">{hedefHesap.name}</span>{" "}
                hesabına açılacak ve bu hesaptaki{" "}
                {businesses.length > 0 ? (
                  <span className="font-medium text-ink">
                    {businesses.map((b) => b.name).join(", ")}
                  </span>
                ) : (
                  "işletmeleri"
                )}{" "}
                görebilecek.
              </>
            ) : (
              "Kullanıcı, içinde bulunduğunuz hesaba açılır."
            )
          }
        />
      </SectionCard>
    </div>
  );
}
