import type { Metadata } from "next";
import { AramaIcerik } from "./AramaIcerik";

export const metadata: Metadata = { title: "Ara" };

export default function AraPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Ara</h1>
      <div className="mt-4">
        <AramaIcerik />
      </div>
    </div>
  );
}
