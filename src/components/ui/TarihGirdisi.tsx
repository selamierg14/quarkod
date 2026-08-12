"use client";

/**
 * Tarih alanı — yazarken kendini sıfırlamayan hâli.
 *
 * `<input type="date">` yalnızca tarih TAMAMLANDIĞINDA bir değer döndürür;
 * yıl hanesine "2" yazıldığı anda `value` boş dizedir. Alan bu boş değere
 * göre yeniden çizilen (kontrollü) bir alansa, kullanıcı 2000 yazmaya
 * çalışırken tarayıcı girdiyi siler ve tarih sürekli sıfırlanır.
 *
 * Çözüm: alan kontrolsüz tutuluyor, yukarıya yalnızca tam tarihler
 * bildiriliyor. Alanın temizlenmesi ise odaktan çıkışta bildiriliyor —
 * böylece "sil" niyeti ile "henüz yazıyorum" hâli birbirine karışmıyor.
 */
export function TarihGirdisi({
  deger,
  onDegisim,
  id,
  name,
  className = "",
  "aria-label": ariaLabel,
}: {
  /** Dışarıdaki değer (yyyy-aa-gg ya da boş). */
  deger: string;
  onDegisim: (yeni: string) => void;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      // Dışarıdan gelen değer değiştiğinde alan yeniden kurulur; yazarken
      // değer değişmediği için bu, girdinin ortasında olmaz.
      key={deger}
      id={id}
      name={name}
      type="date"
      defaultValue={deger}
      aria-label={ariaLabel}
      onChange={(event) => {
        const yeni = event.target.value;
        if (yeni) onDegisim(yeni);
      }}
      onBlur={(event) => {
        if (!event.target.value && deger) onDegisim("");
      }}
      className={className}
    />
  );
}
