import Link from "next/link";

/**
 * Sağ üstte duran profil rozeti — tıklanınca doğrudan Profil sayfasına
 * gider. Sidebar'ın alt kısmındaki kullanıcı kartı zaten aynı yere
 * götürüyordu ama uzun bir sayfada aşağı kaydırmadan erişilebilir bir
 * kısayol da gerekiyordu (patron kendi satırını "Kullanıcılar" listesinde
 * görünce oradan değil, üstteki simgeden profiline gitmeyi bekliyor).
 */
export function ProfilAvatarButton({ ad }: { ad: string }) {
  return (
    <Link
      href="/admin/profil"
      title={`${ad} — Profil`}
      aria-label="Profilim"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-small font-semibold text-ink-soft ring-1 ring-line transition hover:bg-canvas hover:ring-line-strong"
    >
      {ad.trim().charAt(0).toLocaleUpperCase("tr")}
    </Link>
  );
}
