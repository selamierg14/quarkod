import { requireUser } from "@/lib/auth";
import { getActiveAccount } from "@/lib/impersonation";
import { exitAccount } from "./hesaplar/actions";
import { logout } from "../giris/actions";
import { AdminSidebar } from "@/components/AdminSidebar";
import { prisma } from "@/lib/db";
import { ROL_ADLARI } from "@/lib/constants";
import { abonelikUyarisi } from "@/lib/abonelik";
import { panelMenusu, panelModu } from "@/lib/panel";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const aktifHesap = await getActiveAccount(user);

  // Menü, kullanıcının gerçekten girebildiği sayfaları göstermeli: platform
  // yöneticisi bir hesaba girmediği sürece kiracı ekranlarını hiç görmüyor.
  const modu = panelModu(user.role, Boolean(aktifHesap));
  const gruplar = panelMenusu(modu, user.role);

  // Abonelik uyarısı: hem süre dolmadan "yenileyin" hatırlatması, hem de
  // dolduktan sonra "panel salt okunur" bilgisi. Süresi dolan sahip artık
  // girebildiği için bu bant onun tek yönlendirmesi.
  const hesap = user.accountId
    ? await prisma.account.findUnique({
        where: { id: user.accountId },
        select: { active: true, expiresAt: true },
      })
    : null;
  const uyari = hesap ? abonelikUyarisi(hesap) : null;

  return (
    // Mobilde dikey: AdminSidebar'ın mobil başlık çubuğu da bu kabın bir
    // flex öğesi. Yatay dizilimde başlık, içerikle yan yana düşüp paneli
    // telefonda ikiye bölüyordu. lg'den itibaren yan çubuk + içerik yan yana.
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <AdminSidebar
        gruplar={gruplar}
        kullaniciAdi={user.name}
        rolAdi={ROL_ADLARI[user.role] ?? user.role}
        cikis={
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink-soft transition hover:bg-canvas hover:text-ink"
            >
              Çıkış
            </button>
          </form>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Platform yöneticisi bir kiracıyı görüntülüyorsa bu bant hep üstte
            durur: yanlışlıkla müşterinin verisinde işlem yapmayı önler.
            `sticky` şart — sayfayla birlikte kayıp gittiğinde uzun bir listede
            aşağı inen yönetici başkasının hesabında olduğunu unutabiliyordu. */}
        {aktifHesap ? (
          <div className="print-hidden sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-warning-soft px-4 py-2 text-small text-warning-ink shadow-sm">
            <span>
              <span className="font-semibold">{aktifHesap.name}</span> hesabını
              görüntülüyorsunuz. Yaptığınız işlemler bu hesaba yazılır.
            </span>
            <form action={exitAccount}>
              <button
                type="submit"
                className="rounded-chip bg-warning-ink px-3 py-1 text-caption font-medium text-white"
              >
                Görüntülemeden çık
              </button>
            </form>
          </div>
        ) : null}

        {uyari ? (
          <div
            className={`print-hidden px-4 py-2 text-small ${
              uyari.seviye === "bitti"
                ? "bg-danger-line text-danger-deep"
                : "bg-warning-soft text-warning-ink"
            }`}
          >
            <span className="font-semibold">Abonelik:</span> {uyari.mesaj} Yenilemek
            için bizimle iletişime geçin.
          </div>
        ) : null}

        {/* Salt okunur kullanıcı düğmelere basıp hata almasın: kısıt baştan
            söyleniyor. Asıl koruma sunucudaki requireYazma kapısı. */}
        {user.role === "viewer" ? (
          <div className="print-hidden bg-sunken px-4 py-2 text-small text-ink-soft ring-1 ring-inset ring-line">
            <span className="font-semibold">Salt okunur erişim:</span> raporları
            görebilirsiniz, kayıtlarda değişiklik yapamazsınız.
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
