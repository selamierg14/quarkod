import type { Metadata } from "next";
import { SifreDegistirIcerik } from "./SifreDegistirIcerik";

export const metadata: Metadata = { title: "Şifre ve güvenlik" };

export default function SifreDegistirPage() {
  return <SifreDegistirIcerik />;
}
