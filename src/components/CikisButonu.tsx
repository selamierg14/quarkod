"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cihazAboneliginiKapat } from "@/lib/push-cihaz";

/**
 * Çıkış düğmesi.
 *
 * Düz bir `<form action={logout}>` yerine ayrı bir bileşen olmasının tek
 * sebebi var: çıkmadan önce bu cihazın push aboneliğini kapatmak. Aksi
 * halde ortak bir telefonda, çıkış yapmış kullanıcının kilit ekranına
 * müşteri yorumları düşmeye devam ederdi (bkz. lib/push-cihaz.ts).
 *
 * Görünüm dışarıdan geliyor: aynı düğme sol menüde ikonlu/dar, personel
 * kabuğunda küçük bir çip olarak kullanılıyor.
 */
export function CikisButonu({
  action,
  className,
  title,
  children,
}: {
  action: () => Promise<void>;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const [islemde, setIslemde] = useState(false);

  return (
    <button
      type="button"
      title={title}
      disabled={islemde}
      onClick={async () => {
        setIslemde(true);
        await cihazAboneliginiKapat();
        await action();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
