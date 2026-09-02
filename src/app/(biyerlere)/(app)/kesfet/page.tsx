import type { Metadata } from "next";
import { sorguCoz } from "@/lib/kesfet";
import { mekanlariGetir } from "@/lib/kesfet-veri";
import { KesfetAkisi } from "./KesfetAkisi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Keşfet" };

/**
 * Keşfet — Biyerlere'nin ana ekranı.
 *
 * İlk boyama SUNUCUDA olur (konumsuz, geniş bir liste): açılışta boş ekran
 * ya da iskelet göstermek yerine gerçek mekanlar hemen görünür. Konum izni
 * verilince (ya da bir filtre değişince) `KesfetAkisi` aynı listeyi
 * `/api/app/mekanlar`'dan İSTEMCİDE tazeler — geolocation tarayıcı API'si,
 * sunucunun bilebileceği bir şey değil.
 */
export default async function KesfetPage() {
  const ilkSorgu = sorguCoz(new URLSearchParams());
  const ilkVeri = await mekanlariGetir(ilkSorgu);

  return <KesfetAkisi ilkVeri={ilkVeri} />;
}
