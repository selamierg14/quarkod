import "server-only";
import { prisma } from "./db";
import type { SessionUser } from "./session-token";

/**
 * Kim ne yaptı kaydı.
 *
 * Çok kiracılı bir üründe "şikayeti kim çözüldü yaptı", "menüyü kim
 * değiştirdi" sorularının cevabı olmalı; bir uyuşmazlıkta dayanağımız bu.
 *
 * Kayıt yazımı asla işlemi bozmaz: denetim kaydı tutulamadı diye
 * kullanıcının menü güncellemesi geri alınmaz — hata log'a düşer.
 */

export type DenetimEylemi =
  | "feedback.status"
  | "feedback.note"
  | "feedback.respond"
  | "menu.category"
  | "menu.item"
  | "business.create"
  | "business.update"
  | "business.category"
  | "business.table"
  | "business.duyuru"
  | "business.vardiya"
  | "business.izin"
  | "user.create"
  | "user.update"
  | "user.toggle"
  | "user.password"
  | "account.create"
  | "account.toggle"
  | "account.subscription"
  | "account.payment"
  | "account.enter"
  | "account.exit"
  | "consent.reported"
  | "platform.rota"
  | "platform.sponsor"
  | "platform.pushKredisi"
  | "platform.biyerlerePlus";

export const EYLEM_METNI: Record<DenetimEylemi, string> = {
  "feedback.status": "Geri bildirim durumu",
  "feedback.note": "Dahili not",
  "feedback.respond": "Müşteriye yanıt",
  "menu.category": "Menü bölümü",
  "menu.item": "Menü ürünü",
  "business.create": "İşletme açıldı",
  "business.update": "İşletme ayarları",
  "business.category": "Anket kategorisi",
  "business.table": "Masa",
  "business.duyuru": "Duyuru",
  "business.vardiya": "Vardiya çizelgesi",
  "business.izin": "Personel izni",
  "user.create": "Kullanıcı açıldı",
  "user.update": "Kullanıcı güncellendi",
  "user.toggle": "Kullanıcı aktifliği",
  "user.password": "Şifre değişimi",
  "account.create": "Hesap açıldı",
  "account.toggle": "Hesap askıya alma",
  "account.subscription": "Abonelik/geçerlilik",
  "account.payment": "Ödeme kaydı",
  "account.enter": "Hesaba giriş (platform)",
  "account.exit": "Hesaptan çıkış (platform)",
  "consent.reported": "İYS bildirimi",
  "platform.rota": "Biyerlere rotası",
  "platform.sponsor": "Biyerlere sponsor bannerı",
  "platform.pushKredisi": "Biyerlere push kredisi",
  "platform.biyerlerePlus": "Biyerlere Plus üyeliği",
};

/**
 * Denetim kaydının hangi satırlarının görüleceği.
 *
 * Kiracı yalnızca kendi hesabındaki ve kendi ekibinin yaptığı işleri görür:
 * hesabı askıya alma, abonelik değiştirme, hesaba girip çıkma gibi kayıtlar
 * üst katmanın iç denetimidir, alt katmana açılmaz. Kural burada saf bir
 * fonksiyonda duruyor ki test edilebilsin — sayfada elle kurulan bir filtre
 * gözden kaçtığında sızıntı sessiz olur.
 */
export function denetimKapsami(
  role: string,
  aktifHesapId: string | null,
  kullaniciHesapId: string | null,
) {
  if (role === "superadmin" && !aktifHesapId) return {};
  return {
    accountId: aktifHesapId ?? kullaniciHesapId ?? "__yok__",
    NOT: { actorRole: "superadmin" },
  };
}

export async function denetimYaz(
  user: Pick<SessionUser, "id" | "name" | "role" | "accountId">,
  action: DenetimEylemi,
  bilgi: {
    detail?: string;
    entity?: string;
    entityId?: string;
    /** Etkilenen kiracı; platform işlemlerinde kullanıcının hesabından farklı olur. */
    accountId?: string | null;
  } = {},
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        accountId: bilgi.accountId ?? user.accountId ?? null,
        actorId: user.id,
        // Ad ve rol o anki haliyle kopyalanıyor: kullanıcı silinse ya da
        // rolü değişse bile kaydın anlamı bozulmasın.
        actorName: user.name,
        actorRole: user.role,
        action,
        detail: bilgi.detail?.slice(0, 500),
        entity: bilgi.entity,
        entityId: bilgi.entityId,
      },
    });
  } catch (error) {
    console.error("[denetim] kayıt yazılamadı:", error);
  }
}
