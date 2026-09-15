import type { Metadata } from "next";
import { SifreDegistirIcerik } from "./SifreDegistirIcerik";

export const metadata: Metadata = { title: "Şifre değiştir" };

export default function SifreDegistirPage() {
  return <SifreDegistirIcerik />;
}
