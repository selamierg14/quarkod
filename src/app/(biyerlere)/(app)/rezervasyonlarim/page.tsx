import type { Metadata } from "next";
import { RezervasyonListem } from "./RezervasyonListem";

export const metadata: Metadata = { title: "Rezervasyonlarım" };

/**
 * "Rezervasyonlarım" — mobildeki ekranın web eşi.
 *
 * Sunucuda veri çekilmiyor: liste kişiye özel ve tüketici kimliği
 * Bearer jetonla YALNIZCA tarayıcıda taşınıyor (bkz. OturumSaglayici).
 * Sayfanın kendisi ince bir kabuk, iş istemci bileşeninde.
 */
export default function RezervasyonlarimPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-white">Rezervasyonlarım</h1>
      <RezervasyonListem />
    </div>
  );
}
