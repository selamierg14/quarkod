import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { rotaGetir } from "@/lib/rota-veri";
import { RotaDetayIcerik } from "./RotaDetayIcerik";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rota = await rotaGetir(slug);
  return { title: rota?.ad ?? "Rota bulunamadı" };
}

export default async function RotaDetayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rota = await rotaGetir(slug);
  if (!rota) notFound();

  return <RotaDetayIcerik slug={slug} baslangicVerisi={rota} />;
}
