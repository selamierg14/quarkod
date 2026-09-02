import type { Metadata } from "next";
import { ProfilIcerik } from "./ProfilIcerik";

export const metadata: Metadata = { title: "Profilim" };

export default function ProfilPage() {
  return <ProfilIcerik />;
}
