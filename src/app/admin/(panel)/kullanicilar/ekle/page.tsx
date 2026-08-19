import Link from "next/link";
import { prisma } from "@/lib/db";
import { actingAccountId, requireOwner, visibleBusinesses } from "@/lib/auth";
import { NewUserForm } from "../UserForms";
import { acilabilirRoller } from "@/lib/panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yeni kullanıcı" };

export default async function NewUserPage() {
  const owner = await requireOwner();
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
      <div className="flex items-center gap-3">
        <Link
          href="/admin/kullanicilar"
          className="rounded-chip border border-line px-2.5 py-1.5 text-small text-ink-soft hover:bg-canvas"
        >
          ← Listeye dön
        </Link>
        <h1 className="text-title font-semibold">Yeni kullanıcı</h1>
      </div>

      <div className="max-w-2xl rounded-control bg-surface p-5 ring-1 ring-line">
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
      </div>
    </div>
  );
}
