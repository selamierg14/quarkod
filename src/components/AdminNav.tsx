"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  /** manager göremez. */
  ownerOnly?: boolean;
  /** yalnızca platform yöneticisi görür. */
  superadminOnly?: boolean;
};

const LINKS: NavLink[] = [
  { href: "/admin", label: "Özet", exact: true },
  { href: "/admin/geri-bildirimler", label: "Geri bildirimler" },
  { href: "/admin/kirilim", label: "Kırılım" },
  { href: "/admin/isletmeler", label: "İşletmeler" },
  { href: "/admin/kiyaslama", label: "İşletme kıyaslama", ownerOnly: true },
  { href: "/admin/izinler", label: "İleti izinleri", ownerOnly: true },
  { href: "/admin/kullanicilar", label: "Kullanıcılar", ownerOnly: true },
  { href: "/admin/hesaplar", label: "Hesaplar", superadminOnly: true },
];



export function AdminNav({
  isOwner,
  isSuperadmin,
}: {
  isOwner: boolean;
  isSuperadmin: boolean;
}) {
  const pathname = usePathname();

  const visible = LINKS.filter((link) => {
    if (link.superadminOnly) return isSuperadmin;
    if (link.ownerOnly) return isOwner;
    return true;
  });

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1">
      {visible.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              rounded-lg px-3 py-2 text-sm whitespace-nowrap transition
              ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
