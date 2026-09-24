"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

/**
 * Geri alınamaz silme işlemleri için İKİ AŞAMALI düğme.
 *
 * Neden var: panelde dört gerçek silme tek tıkla çalışıyordu ve hiçbirinin
 * onayı yoktu — duyuru silme, rota durağı çıkarma, menü ürünü silme ve
 * menü KATEGORİSİ silme. Sonuncusu en ağırı: kategori silindiğinde
 * altındaki bütün ürünler de gidiyor (veritabanında cascade), yani yanlış
 * satıra düşen tek bir tık bir menü bölümünü tamamen siliyordu.
 *
 * NEDEN MODAL (Dialog) DEĞİL. Bu düğmeler yoğun listelerin içinde, satır
 * başına bir tane duruyor. Her biri için modal açmak odak tuzağı, kapatma
 * davranışı ve satırın hangi kaydı temsil ettiğini modal içinde tekrar
 * anlatma yükü getiriyor. İki aşamalı düğme, onayı eylemin TAM YERİNDE
 * soruyor — kullanıcı hangi satıra bastığını zaten görüyor.
 *
 * İlk tık FORMU GÖNDERMİYOR (`type="button"`), yalnızca düğmeyi onay
 * durumuna alıyor. İkinci tık gerçek gönderim. Beş saniye içinde
 * onaylanmazsa kendiliğinden geri dönüyor: kullanıcı başka bir işe
 * geçtiyse ekranda "silmek üzereyim" diyen bir düğme asılı kalmasın.
 *
 * `aria-live` ile durum değişimi duyuruluyor — ekran okuyucu kullanan
 * biri düğmenin "sil"den "onayla"ya döndüğünü görmüyor, duyması gerekiyor.
 */
export function SilDugmesi({
  children,
  onayMetni = "Emin misiniz?",
  className = "",
  onayClassName,
  ...rest
}: Omit<ComponentProps<"button">, "type" | "onClick"> & {
  children: ReactNode;
  /** İkinci aşamada gösterilen metin. */
  onayMetni?: ReactNode;
  /** Onay aşamasında ek sınıf — genelde daha uyarıcı bir renk. */
  onayClassName?: string;
}) {
  const [onayBekliyor, setOnayBekliyor] = useState(false);
  const { pending } = useFormStatus();
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
    };
  }, []);

  function ilkTik() {
    setOnayBekliyor(true);
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => setOnayBekliyor(false), 5000);
  }

  return (
    <button
      // Aşama farkı burada: onay beklerken düğme gerçekten submit,
      // öncesinde yalnızca bir anahtar.
      type={onayBekliyor ? "submit" : "button"}
      onClick={onayBekliyor ? undefined : ilkTik}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-live="polite"
      className={`${className} ${onayBekliyor ? (onayClassName ?? "") : ""}`.trim()}
      {...rest}
    >
      {onayBekliyor ? onayMetni : children}
    </button>
  );
}
