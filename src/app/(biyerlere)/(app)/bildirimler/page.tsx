import type { Metadata } from "next";
import { BildirimlerIcerik } from "./BildirimlerIcerik";
import { BildirimTercihleri } from "./BildirimTercihleri";

export const metadata: Metadata = { title: "Bildirimler" };

export default function BildirimlerPage() {
  return (
    <div>
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold text-white">Bildirimler</h1>
        <BildirimTercihleri />
      </div>
      <div className="mt-4">
        <BildirimlerIcerik />
      </div>
    </div>
  );
}
