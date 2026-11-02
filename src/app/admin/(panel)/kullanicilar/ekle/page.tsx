import { Plus, User } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/cekirdek/db";
import { actingAccountId, requireKullaniciYonetimi, visibleBusinesses } from "@/lib/kimlik/auth";
import { NewUserForm } from "../UserForms";
import { acilabilirRoller } from "@/lib/kimlik/panel";
import { verilebilirModuller } from "@/lib/kimlik/moduller";
import { PageHeader, SectionCard, buttonClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Yeni kullanıcı" };

export default async function NewUserPage() {
  const owner = await requireKullaniciYonetimi();
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

  // Hesap seçmemiş platform yöneticisi hedefi formdan seçiyor.
  const hesaplar =
    !hedefHesapId && owner.role === "superadmin"
      ? await prisma.account.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/kullanicilar"
        className={buttonClass({ variant: "secondary", size: "sm", className: "self-start" })}
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
          verilebilirModuller={verilebilirModuller(owner.role, owner.moduller)}
          hesaplar={hesaplar}
          hint={
            // "Hangi kafeye kullanıcı açıyorum?" sorusu formun en kritik ama
            // en görünmez parçasıydı. Önceki metin hem bozuktu ("…bu
            // hesaptaki KESKİNLEZZETLER görebilecek", QA) hem de yanlıştı:
            // kimin neyi gördüğü role bağlı, hesabın tamamı değil.
            hedefHesap ? (
              businesses.length === 1 ? (
                <>
                  Bu kullanıcı{" "}
                  <span className="font-medium text-ink">{hedefHesap.name}</span>{" "}
                  hesabında,{" "}
                  <span className="font-medium text-ink">{businesses[0].name}</span>{" "}
                  işletmesi için açılacak.
                </>
              ) : (
                <>
                  Bu kullanıcı{" "}
                  <span className="font-medium text-ink">{hedefHesap.name}</span>{" "}
                  hesabına açılacak. Hangi işletmeleri göreceği aşağıdaki rol ve
                  işletme seçimine bağlı.
                </>
              )
            ) : hesaplar.length > 0 ? (
              "Kullanıcının açılacağı hesabı aşağıdan seçin."
            ) : (
              "Kullanıcı, içinde bulunduğunuz hesaba açılır."
            )
          }
        />
      </SectionCard>
    </div>
  );
}
