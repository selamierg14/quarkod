import { requireUser, visibleBusinesses } from "@/lib/auth";
import { getActiveAccount } from "@/lib/impersonation";
import { exitAccount } from "./hesaplar/actions";
import { logout } from "../giris/actions";
import { AdminSidebar } from "@/components/AdminSidebar";
import { PersonelKabuk } from "@/components/PersonelKabuk";
import { ProfilAvatarButton } from "@/components/ProfilAvatarButton";
import { prisma } from "@/lib/db";
import { ROL_ADLARI } from "@/lib/constants";
import { Suspense } from "react";
import { abonelikUyarisi } from "@/lib/abonelik";
import { BildirimUyarisi } from "./BildirimUyarisi";
import { ToastProvider } from "@/components/ui";
import { panelMenusu, panelModu } from "@/lib/panel";

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
          select: { active: true, expiresAt: true },
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
    { menuIzni: user.menuIzni ?? true, anketIzni: user.anketIzni ?? true },
    isletmeler.length === 1 ? isletmeler[0].id : null,
  );

  // Abonelik uyarısı: hem süre dolmadan "yenileyin" hatırlatması, hem de
  // dolduktan sonra "panel salt okunur" bilgisi. Süresi dolan sahip artık
  // girebildiği için bu bant onun tek yönlendirmesi.
  const uyari = hesap ? abonelikUyarisi(hesap) : null;

  // Saha personeli (garson) tamamen ayrı, sade bir kabuk görüyor — yönetici
  // sidebar'ının onda karşılığı yok, iki ekranı var.
  if (modu === "personel") {
    return (
      <ToastProvider>
        <PersonelKabuk ad={user.name}>{children}</PersonelKabuk>
      </ToastProvider>
    );
  }

  return (
    // Mobilde dikey: AdminSidebar'ın mobil başlık çubuğu da bu kabın bir
    // flex öğesi. Yatay dizilimde başlık, içerikle yan yana düşüp paneli
    // telefonda ikiye bölüyordu. lg'den itibaren yan çubuk + içerik yan yana.
    <ToastProvider>
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
        {/* Sağ üstte sabit profil rozeti: uzun bir listede kendi satırını
            görüp "profilime nasıl gidiyordum" diye sidebar'ın altını
            aramak yerine buradan tek tıkla gidilsin. Mobilde bu rozet
            AdminSidebar'ın kendi başlık çubuğunda — burada tekrar
            göstermek iki üst üste çubuk demek olurdu. */}
        <div className="print-hidden hidden items-center justify-end border-b border-line bg-surface px-4 py-2.5 lg:flex lg:px-8">
          <ProfilAvatarButton ad={user.name} />
        </div>

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

        {/* Uyarı sayfanın kendisi değil, kenar bilgisi: Suspense içinde
            akıtılıyor ki sorgusu panelin açılmasını bekletmesin. */}
        {modu === "kiraci" ? (
          <Suspense fallback={null}>
            <BildirimUyarisi isletmeIdleri={isletmeler.map((i) => i.id)} />
          </Suspense>
        ) : null}

        {/* Salt okunur kullanıcı düğmelere basıp hata almasın: kısıt baştan
            söyleniyor. Asıl koruma sunucudaki requireYazma kapısı. */}
        {user.role === "viewer" ? (
          <div className="print-hidden bg-sunken px-4 py-2 text-small text-ink-soft ring-1 ring-inset ring-line">
            <span className="font-semibold">Salt okunur erişim:</span> raporları
            görebilirsiniz, kayıtlarda değişiklik yapamazsınız.
          </div>
        ) : null}

        {/* Üst sınır yok: geniş ekranda tablolar (Kullanıcılar, Ürünler,
            Vardiya çizelgesi) kalan tüm genişliği kullansın diye kaldırıldı
            — kutuya sıkışmış görünüyordu. Mobilde zaten viewport dar olduğu
            için etkisi yok. */}
        <main id="icerik" className="w-full flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
