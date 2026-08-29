import { ChevronDown, Users } from "lucide-react";

export type SorumluKisi = {
  id: string;
  name: string;
  username: string;
  active: boolean;
  /** Hesap sahipleri listesinde rol de gösteriliyor. */
  rol?: string;
};

/** Kaç isim açmadan gösterilsin — gerisi "+N daha" olarak katlanıyor. */
const ESIK = 2;

function Kisi({ kisi }: { kisi: SorumluKisi }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className={kisi.active ? "" : "text-ink-faint line-through"}>
        {kisi.name}
      </span>
      <span className="font-mono text-caption text-ink-faint">{kisi.username}</span>
      {kisi.rol ? <span className="text-caption text-ink-faint">{kisi.rol}</span> : null}
    </span>
  );
}

/**
 * Bir işletmenin ya da hesabın sorumluları.
 *
 * Önceden bütün isimler virgülle ayrılmış tek bir paragrafa basılıyordu.
 * On bir kişilik bir işletmede bu, ad + kullanıcı adı + rol üçlüsünün
 * arka arkaya dizildiği, nerede bittiği belli olmayan bir metin bloğuna
 * dönüşüyor ve asıl bilgiyi (işletmenin adı, QR sayısı, geri bildirim
 * sayısı) bastırıyordu.
 *
 * Artık ilk ikisi görünüyor, gerisi sayıyla katlanıyor: "kim sorumlu"
 * sorusuna hızlı cevap veriyor, tam liste isteyene bir tık uzakta.
 */
export function SorumluListesi({
  kisiler,
  bosMesaj = "Sorumlu atanmamış",
  etiket = "Sorumlu",
}: {
  kisiler: SorumluKisi[];
  bosMesaj?: string;
  etiket?: string;
}) {
  if (kisiler.length === 0) {
    return <p className="mt-1 text-caption text-rating">{bosMesaj}</p>;
  }

  const gorunen = kisiler.slice(0, ESIK);
  const gizli = kisiler.slice(ESIK);

  return (
    <div className="mt-1 text-caption text-ink-muted">
      <span className="text-ink-faint">{etiket}: </span>
      {gorunen.map((kisi, i) => (
        <span key={kisi.id}>
          {i > 0 ? ", " : ""}
          <Kisi kisi={kisi} />
        </span>
      ))}

      {gizli.length > 0 ? (
        <details className="group mt-0.5 inline-block align-top">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-chip bg-sunken px-2 py-0.5 text-caption font-medium text-ink-soft hover:bg-canvas">
            <Users className="h-3 w-3" aria-hidden="true" />+{gizli.length} daha
            <ChevronDown
              className="h-3 w-3 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5 border-l border-line pl-2.5">
            {gizli.map((kisi) => (
              <li key={kisi.id}>
                <Kisi kisi={kisi} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
