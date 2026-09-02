import type { Metadata } from "next";
import { BildirimlerIcerik } from "./BildirimlerIcerik";

export const metadata: Metadata = { title: "Bildirimler" };

export default function BildirimlerPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Bildirimler</h1>
      <div className="mt-4">
        <BildirimlerIcerik />
      </div>
    </div>
  );
}
