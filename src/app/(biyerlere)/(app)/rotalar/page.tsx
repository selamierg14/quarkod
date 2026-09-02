import type { Metadata } from "next";
import { RotalarIcerik } from "./RotalarIcerik";

export const metadata: Metadata = { title: "Rotalar" };

export default function RotalarPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Rotalar</h1>
      <p className="mt-1 text-small text-slate-400">
        Şehrin kahve pasaportu — bir rotadaki tüm mekanları gez, bonus puan kazan.
      </p>
      <div className="mt-4">
        <RotalarIcerik />
      </div>
    </div>
  );
}
