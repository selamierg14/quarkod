import bcrypt from "bcryptjs";
import Link from "next/link";
import { ArrowDown, ArrowUp, KeyRound, Pencil, Users } from "lucide-react";
import { prisma } from "@/lib/cekirdek/db";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import {
  actingAccountId,
  requireKullaniciYonetimi,
  userScope,
  visibleBusinesses,
} from "@/lib/kimlik/auth";
import { ResetPasswordForm, ToggleUserButton } from "./UserForms";
import { SEED_SIFRESI } from "./sabitler";
import { ROL_ADLARI } from "@/lib/cekirdek/constants";
import { acilabilirRoller } from "@/lib/kimlik/panel";
import { Alert, BasHarfAvatar, ButtonLink, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { KullaniciFiltreleri } from "./KullaniciFiltreleri";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kullanıcılar" };

/** Rol rozeti — renk değil, ton farkı: satırda tek bir vurgu rengi kalsın. */
function RolRozeti({ rol }: { rol: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-chip bg-sunken px-2 py-0.5 text-caption font-medium text-ink-soft">
      {ROL_ADLARI[rol] ?? rol}
    </span>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const owner = await requireKullaniciYonetimi();
  const params = await searchParams;
  const tek = (ad: string) => {
    const deger = params[ad];
    return (Array.isArray(deger) ? deger[0] : deger)?.trim() ?? "";
  };

  const filtreler = {
    q: tek("q"),
    rol: tek("rol"),
    durum: tek("durum"),
    isletme: tek("isletme"),
    hesap: tek("hesap"),
  };
  const filtreVar = Object.values(filtreler).some(Boolean);

  // Sıralanabilir başlıklar (UI incelemesi). Sunucuda — liste sayfalı,
  // istemcide sıralamak yalnızca o sayfayı sıralardı.
  type Sira = "ad" | "rol" | "durum";
  const sira = (["ad", "rol", "durum"] as const).find((s) => s === tek("sirala")) ?? null;
  const ters = tek("yon") === "azalan";
  const yon = ters ? ("desc" as const) : ("asc" as const);
  const siralama =
    sira === "ad"
      ? [{ name: yon }]
      : sira === "rol"
        ? [{ role: yon }, { name: "asc" as const }]
        : sira === "durum"
          ? // Artan = önce aktifler.
            [{ active: ters ? ("asc" as const) : ("desc" as const) }, { name: "asc" as const }]
          : [{ role: "asc" as const }, { name: "asc" as const }];

  // Hesap seçmemiş platform yöneticisi bütün kiracıların kullanıcılarını
  // görür; onun için anlamlı süzgeç "işletme" değil "hesap" (bir işletme
  // listesi yüzlerce satır olurdu ve hangi müşteriye ait olduğu belirsiz).
  const platformModu = owner.role === "superadmin" && !(await actingAccountId(owner));

  const isletmeler = platformModu ? [] : await visibleBusinesses(owner);
  const hesaplar = platformModu
    ? await prisma.account.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Süzme veritabanında: onlarca işletmeli bir hesapta bütün kullanıcıları
  // çekip bellekte elemek hem yavaş hem gereksiz.
  /**
   * Liste eskiden SINIRSIZ çekiliyordu: elli işletmeli bir hesapta tek
   * sayfada yüzlerce satır, her biri için ayrıca bcrypt karşılaştırması
   * (aşağıdaki "varsayılan şifre" işareti) demekti.
   */
  const kullaniciKosulu = {
      ...(await userScope(owner)),
      ...(filtreler.q
        ? {
            OR: [
              { name: { contains: filtreler.q, mode: "insensitive" as const } },
              { username: { contains: filtreler.q, mode: "insensitive" as const } },
              { email: { contains: filtreler.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(filtreler.rol ? { role: filtreler.rol } : {}),
      ...(filtreler.durum ? { active: filtreler.durum === "aktif" } : {}),
      // Bölge müdürünün işletmeleri ayrı tabloda; "bu işletmede kim var"
      // sorusu ikisini birden kapsamalı.
      ...(filtreler.isletme
        ? {
            OR: [
              { businessId: filtreler.isletme },
              { businesses: { some: { businessId: filtreler.isletme } } },
            ],
          }
        : {}),
      ...(filtreler.hesap ? { accountId: filtreler.hesap } : {}),
  };

  const toplam = await prisma.user.count({ where: kullaniciKosulu });
  const durum = sayfaDurumu({ sayfa: tek("sayfa"), boyut: tek("boyut") }, toplam);

  const users = await prisma.user.findMany({
    where: kullaniciKosulu,
    orderBy: siralama,
    skip: durum.skip,
    take: durum.take,
    include: {
      business: true,
      businesses: { include: { business: true } },
      account: { select: { name: true } },
    },
  });

  // Her satır için ayrı bir sorguyla "varsayılan şifre mi" sormak N+1'di;
  // cevap zaten yukarıdaki sorgunun getirdiği passwordHash'te.
  const seedFlags = await Promise.all(
    users.map(
      async (user) => [user.id, await bcrypt.compare(SEED_SIFRESI, user.passwordHash)] as const,
    ),
  );
  /** Süzgeçleri koruyarak sayfa numarasını değiştiren adres. */
  function adres(degisiklik: Record<string, string | null>): string {
    const p = new URLSearchParams();
    for (const [ad, deger] of Object.entries(filtreler)) {
      if (deger) p.set(ad, deger);
    }
    if (sira) p.set("sirala", sira);
    if (ters) p.set("yon", "azalan");
    if (durum.boyut !== 10) p.set("boyut", String(durum.boyut));
    for (const [ad, deger] of Object.entries(degisiklik)) {
      if (deger === null) p.delete(ad);
      else p.set(ad, deger);
    }
    const metin = p.toString();
    return metin ? `/admin/kullanicilar?${metin}` : "/admin/kullanicilar";
  }
  const sayfaAdresi = (hedef: number) => adres({ sayfa: String(hedef) });

  /** Başlığa tıklamak o sütuna göre sıralar; ikinci tık yönü çevirir. */
  function siralamaBasligi(anahtar: Sira, etiket: string) {
    const aktif = sira === anahtar;
    return (
      <Link
        href={adres({
          sirala: anahtar,
          yon: aktif && !ters ? "azalan" : null,
          sayfa: null,
        })}
        className={`inline-flex items-center gap-1 hover:text-ink ${aktif ? "text-ink" : ""}`}
        aria-label={`${etiket} sütununa göre sırala`}
      >
        {etiket}
        {aktif ? (
          ters ? (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          )
        ) : null}
      </Link>
    );
  }

  const usingSeed = new Map(seedFlags);
  /**
   * Uyarı BU SAYFADAKİ kaçının kurulum şifresini kullandığını söylüyor.
   *
   * Liste sayfalandıktan sonra "hesabın tamamında kaç tane" sorusunu
   * cevaplamak, her sayfa açılışında bütün kullanıcıların şifresini
   * bcrypt ile karşılaştırmak demekti — sayfalamanın kaldırdığı yükün ta
   * kendisi. Metin de buna göre yazıldı.
   */
  const seedCount = seedFlags.filter(([, flag]) => flag).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        ikon={<Users className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Kullanıcılar"
        description="Panele giren ekip üyeleri, rolleri ve modül izinleri."
        action={
          <ButtonLink href="/admin/kullanicilar/ekle" size="sm">
            + Yeni kullanıcı
          </ButtonLink>
        }
      />

      <KullaniciFiltreleri
        degerler={filtreler}
        isletmeler={isletmeler.map((b) => ({ id: b.id, name: b.name }))}
        hesaplar={hesaplar}
        roller={acilabilirRoller(owner.role)}
        filtreVar={filtreVar}
      />

      {seedCount > 0 ? (
        <Alert
          tone="uyari"
          baslik={`Bu sayfadaki ${seedCount} hesap hâlâ kurulum şifresini kullanıyor`}
        >
          Sisteme gerçek veri girmeden önce <code>degistir123</code> şifresini
          değiştirin.
        </Alert>
      ) : null}

      {users.length === 0 ? (
        <EmptyState
          ikon={<Users className="h-5 w-5" aria-hidden="true" />}
          baslik={filtreVar ? "Bu filtreye uyan kullanıcı yok" : "Henüz kullanıcı yok"}
        >
          {filtreVar
            ? "Filtreleri temizleyip tekrar deneyin."
            : "Ekibinizi kurmak için ilk kullanıcıyı ekleyin."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
          <p className="border-b border-line px-4 py-2 text-caption text-ink-muted">
            {filtreVar ? `${toplam} sonuç bulundu` : `${toplam} kullanıcı`}
          </p>
          <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead className="bg-sunken/70 text-left text-overline font-semibold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-4 py-2">{siralamaBasligi("ad", "İsim")}</th>
                <th className="hidden px-4 py-2 md:table-cell">İletişim</th>
                <th className="px-4 py-2">{siralamaBasligi("rol", "Rol")}</th>
                <th className="hidden px-4 py-2 lg:table-cell">
                  {platformModu ? "Hesap / İşletme" : "İşletme"}
                </th>
                <th className="px-4 py-2">{siralamaBasligi("durum", "Durum")}</th>
                {/* İşlem sütunu sağa yapışık: geniş tabloda yatay kaydırmanın
                    arkasında kalıyordu (UI incelemesi: 1197px içerik / 1052px alan). */}
                <th className="sticky right-0 bg-sunken px-4 py-2 text-right">
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => {
                const isletmeAdi =
                  user.role === "bolge"
                    ? user.businesses.map((b) => b.business.name).join(", ") || "—"
                    : (user.business?.name ?? (user.role === "owner" ? "Tüm işletmeler" : "—"));
                // Hesap ile işletme aynı adı taşıyorsa (tek şubeli müşteri)
                // ikinci satır aynı adı tekrar ediyordu.
                const tekrar = platformModu && isletmeAdi === user.account?.name;
                return (
                <tr key={user.id} className="transition-colors hover:bg-sunken/50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <BasHarfAvatar ad={user.name} soluk={!user.active} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <span className={user.active ? "font-medium text-ink" : "text-ink-faint"}>
                            {user.name}
                          </span>
                          {user.id === owner.id ? (
                            <span className="text-caption text-ink-faint">(siz)</span>
                          ) : null}
                          {usingSeed.get(user.id) ? (
                            <span className="rounded bg-warning-soft px-1.5 py-0.5 text-caption font-medium text-warning-ink">
                              kurulum şifresi
                            </span>
                          ) : null}
                        </div>
                        <span className="block font-mono text-caption text-ink-faint">
                          {user.username}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 text-ink-soft md:table-cell">
                    <span className="block max-w-56 truncate">{user.email}</span>
                    <span className="block text-caption tabular">
                      {user.phone ? (
                        <span className="text-ink-faint">{user.phone}</span>
                      ) : (
                        <span
                          className="font-medium text-warning-ink"
                          title="2FA ve şifre sıfırlama için gerekli"
                        >
                          telefon yok
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <RolRozeti rol={user.role} />
                  </td>
                  <td className="hidden px-4 py-2 text-ink-soft lg:table-cell">
                    {platformModu ? (
                      <span className="block font-medium text-ink">
                        {user.account?.name ?? "—"}
                      </span>
                    ) : null}
                    {tekrar ? null : (
                      <span className={platformModu ? "text-caption text-ink-faint" : ""}>
                        {isletmeAdi}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {/* Durum filtresi vardı ama sütunu yoktu; pasiflik yalnızca
                        üstü çizili addan anlaşılıyordu. Renk + metin birlikte. */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-caption font-medium ${
                        user.active ? "bg-success-soft text-success-ink" : "bg-sunken text-ink-muted"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${user.active ? "bg-success" : "bg-ink-faint"}`}
                      />
                      {user.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="sticky right-0 bg-surface px-4 py-2">
                    {/* Satırda tek bir dolu aksiyon var: Düzenle. Şifre
                        sıfırlama nötr, pasifleştirme riskli. */}
                    <div className="flex items-center justify-end gap-1.5">
                      {user.id === owner.id ? null : (
                        <ButtonLink
                          href={`/admin/kullanicilar/${user.id}/duzenle`}
                          size="sm"
                          variant="secondary"
                          className="px-2"
                          title={`${user.name} — düzenle`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Düzenle</span>
                        </ButtonLink>
                      )}
                      <ResetPasswordForm userId={user.id} />
                      <ToggleUserButton
                        userId={user.id}
                        active={user.active}
                        ad={user.name}
                        disabled={user.id === owner.id}
                      />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {cubukGosterilsinMi(toplam, durum.boyut) ? (
        <Pagination
          sayfa={durum.sayfa}
          toplamSayfa={toplamSayfa(toplam, durum.boyut)}
          toplamKayit={toplam}
          boyut={durum.boyut}
          aralik={aralikMetni(durum, toplam)}
          href={(s) => sayfaAdresi(s)}
        />
      ) : null}

      <p className="text-caption text-ink-faint">
        <KeyRound className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Kullanıcılar silinmez, pasifleştirilir: pasif kullanıcı panele giremez
        ama geçmiş kayıtlarındaki adı ve işlem geçmişi yerinde kalır.
      </p>
    </div>
  );
}
