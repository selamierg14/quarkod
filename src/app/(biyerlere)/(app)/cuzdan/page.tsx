import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CuzdanIcerik } from "./CuzdanIcerik";
import { KUPON_AKTIF } from "@/lib/biyerlere/kupon";

export const metadata: Metadata = { title: "Cüzdanım" };

export default function CuzdanPage() {
  // Özellik kapalıyken sayfa hiç yokmuş gibi davranıyor. Boş bir cüzdan
  // göstermek, kullanıcıya "burada bir şeyin olması gerekiyordu" hissi
  // verirdi; adresi elle yazan da 404 görüyor (bkz. lib/biyerlere/kupon.ts).
  if (!KUPON_AKTIF) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Cüzdanım</h1>
      <div className="mt-4">
        <CuzdanIcerik />
      </div>
    </div>
  );
}
