"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Özet", exact: true, ownerOnly: false },
  { href: "/admin/geri-bildirimler", label: "Geri bildirimler", ownerOnly: false },
  { href: "/admin/kirilim", label: "Kırılım", ownerOnly: false },
  { href: "/admin/isletmeler", label: "İşletmeler", ownerOnly: false },
  { href: "/admin/kiyaslama", label: "İşletme kıyaslama", ownerOnly: true },
  { href: "/admin/kullanicilar", label: "Kullanıcılar", ownerOnly: true },
];

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1">
      {LINKS.filter((link) => isOwner || !link.ownerOnly).map((link) => {
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
