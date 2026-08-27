import { Settings } from "lucide-react";
import { visibleBusinesses } from "@/lib/auth";
import { SectionCard } from "@/components/ui";
import { AyarlariKopyala } from "./AyarlariKopyala";
import { SettingsForm } from "./SettingsForm";
import { IsletmeUst } from "./IsletmeUst";
import { isletmeyiYukle } from "./_veri";

export const dynamic = "force-dynamic";

export const metadata = { title: "İşletme ayarları" };

export default async function BusinessSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, business } = await isletmeyiYukle(id);
  const kardesler = (await visibleBusinesses(user))
    .filter((b) => b.id !== business.id)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="flex flex-col gap-5">
      <IsletmeUst business={business} aktif="ayarlar" />

      <SectionCard
        ikon={<Settings className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="İşletme ayarları"
        description="Müşterinin QR'ı okuttuğunda gördüğü isim, görseller, marka rengi ve yönlendirmeler."
      >
        <SettingsForm
          business={{
            id: business.id,
            name: business.name,
            type: business.type,
            address: business.address,
            googleReviewUrl: business.googleReviewUrl,
            brandColor: business.brandColor,
            notifyThreshold: business.notifyThreshold,
            googleRedirect: business.googleRedirect,
            qrCardText: business.qrCardText,
            iysBrandCode: business.iysBrandCode,
            logoUrl: business.logoUrl,
            coverUrl: business.coverUrl,
            instagramUrl: business.instagramUrl,
            wifiSsid: business.wifiSsid,
            wifiPassword: business.wifiPassword,
            announcement: business.announcement,
            announcementActive: business.announcementActive,
            yemeksepetiUrl: business.yemeksepetiUrl,
            getirUrl: business.getirUrl,
            trendyolUrl: business.trendyolUrl,
            migrosUrl: business.migrosUrl,
          }}
          isOwner={user.role === "owner"}
        />
      </SectionCard>

      <AyarlariKopyala businessId={business.id} hedefler={kardesler} />
    </div>
  );
}
