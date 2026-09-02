import type { Metadata } from "next";
import { CuzdanIcerik } from "./CuzdanIcerik";

export const metadata: Metadata = { title: "Cüzdanım" };

export default function CuzdanPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Cüzdanım</h1>
      <div className="mt-4">
        <CuzdanIcerik />
      </div>
    </div>
  );
}
