import { requireUser, visibleBusinesses } from "@/lib/kimlik/auth";
import { getActiveAccount } from "@/lib/kimlik/impersonation";
import { exitAccount } from "./hesaplar/actions";
import { logout } from "../giris/actions";
import { AdminSidebar } from "@/components/AdminSidebar";
import { KomutPaleti } from "@/components/KomutPaleti";
import { PersonelKabuk } from "@/components/PersonelKabuk";
import { KonumYolu, UstCubuk } from "@/components/UstCubuk";
import { prisma } from "@/lib/cekirdek/db";
import { ROL_ADLARI } from "@/lib/cekirdek/constants";
import { abonelikUyarisi } from "@/lib/isletme/abonelik";
import { ToastProvider } from "@/components/ui";
import { panelMenusu, panelModu } from "@/lib/kimlik/panel";
import { PANEL_FONT_SINIFI } from "../fontlar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();

  // Bu iki sorgu yalnızca `user`a bağlı, birbirine değil. Sırayla beklemek
  // her panel sayfasına bir tur veritabanı gecikmesi ekliyordu.
  const [aktifHesap, hesap] = await Promise.all([
    getActiveAccount(user),
    user.accountId
      ? prisma.account.findUnique({
          where: { id: user.accountId },
          select: { active: true, expiresAt: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  // Menü, kullanıcının gerçekten girebildiği sayfaları göstermeli: platform
  // yöneticisi bir hesaba girmediği sürece kiracı ekranlarını hiç görmüyor.
  const modu = panelModu(user.role, Boolean(aktifHesap));
  // "İşletmeler" menüsündeki "Düzenle" kısayolu için: tek işletmeli hesapta
  // doğrudan o işletmenin ayarlarına gider.
  const isletmeler = modu === "kiraci" ? await visibleBusinesses(user) : [];
  const gruplar = panelMenusu(
    modu,
    user.role,
    user.moduller,
    isletmeler.length === 1 ? isletmeler[0].id : null,
  );

  // Abonelik uyarısı: hem süre dolmadan "yenileyin" hatırlatması, hem de
  // dolduktan sonra "panel salt okunur" bilgisi. Süresi dolan sahip artık
  // girebildiği için bu bant onun tek yönlendirmesi.
  const uyari = hesap ? abonelikUyarisi(hesap) : null;

  // Kenar çubuğunun tepesindeki çalışma alanı kartı: "şu an kimin
  // panelindeyim" sorusunun cevabı her ekranda aynı yerde.
  const rolAdi = ROL_ADLARI[user.role] ?? user.role;
  const calismaAlani = aktifHesap
    ? { ad: aktifHesap.name, alt: "Görüntüleniyor" }
    : modu === "platform"
      ? { ad: "Quarkod Platform", alt: "Tüm hesaplar" }
      : isletmeler.length === 1
        ? { ad: isletmeler[0].name, alt: hesap?.name ?? rolAdi }
        : { ad: hesap?.name ?? "Hesabım", alt: `${isletmeler.length} işletme` };

  // Saha personeli (garson) tamamen ayrı, sade bir kabuk görüyor — yönetici
  // sidebar'ının onda karşılığı yok, iki ekranı var.
  if (modu === "personel") {
    return (
      <ToastProvider>
        <div data-tema="panel" className={PANEL_FONT_SINIFI}>
          <PersonelKabuk ad={user.name}>{children}</PersonelKabuk>
        </div>
      </ToastProvider>
    );
  }

  return (
    // Mobilde dikey: AdminSidebar'ın mobil başlık çubuğu da bu kabın bir
    // flex öğesi. Yatay dizilimde başlık, içerikle yan yana düşüp paneli
    // telefonda ikiye bölüyordu. lg'den itibaren yan çubuk + içerik yan yana.
    <ToastProvider>
    {/* data-tema: panel teması yalnızca bu kabuğun içinde (bkz.
        globals.css). Çalışma alanı beyaz; kenar çubuğu çam yeşili. */}
    <div
      data-tema="panel"
      className={`${PANEL_FONT_SINIFI} flex min-h-dvh flex-col bg-canvas lg:flex-row lg:gap-3 lg:p-3`}
    >
      {/* Ctrl/Cmd+K ile sayfa arama. Sidebar'la aynı menü ağacından
          beslendiği için ayrıca güncellenmesi gereken bir liste yok. */}
      <KomutPaleti gruplar={gruplar} />

      <AdminSidebar
        gruplar={gruplar}
        kullaniciAdi={user.name}
        rolAdi={rolAdi}
        calismaAlani={calismaAlani}
        cikisAction={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:gap-3">
        <UstCubuk ad={user.name} rolAdi={rolAdi} />

        {/* Platform yöneticisi bir kiracıyı görüntülüyorsa bu bant hep üstte
            durur: yanlışlıkla müşterinin verisinde işlem yapmayı önler.
            `sticky` şart — sayfayla birlikte kayıp gittiğinde uzun bir listede
            aşağı inen yönetici başkasının hesabında olduğunu unutabiliyordu. */}
        {aktifHesap ? (
          <div className="print-hidden sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-warning-soft px-4 py-2 text-small text-warning-ink lg:top-3 lg:rounded-card">
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
            className={`print-hidden px-4 py-2 text-small lg:rounded-card ${
              uyari.seviye === "bitti"
                ? "bg-danger-line text-danger-deep"
                : "bg-warning-soft text-warning-ink"
            }`}
          >
            <span className="font-semibold">Abonelik:</span> {uyari.mesaj} Yenilemek
            için bizimle iletişime geçin.
          </div>
        ) : null}

        {/* Üst sınır yok: içerik kalan bütün genişliği kullanıyor. Konum yolu
            sayfa başlığının hemen üstünde (referans tasarımdaki gibi). */}
        <main id="icerik" className="flex w-full min-w-0 flex-1 flex-col gap-2 px-4 py-5 lg:px-2 lg:py-2">
          <KonumYolu gruplar={gruplar} />
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
