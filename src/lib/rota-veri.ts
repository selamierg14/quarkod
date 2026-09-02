import "server-only";
import { prisma } from "./db";
import { gorselAdresi } from "./gorsel-adres";

export type RotaOzet = {
  id: string;
  slug: string;
  ad: string;
  aciklama: string | null;
  duraklar: {
    id: string;
    businessId: string;
    slug: string;
    ad: string;
    logoUrl: string | null;
  }[];
};

/** `/rotalar` ve `/api/app/rotalar`'ın ortak, kimlik gerektirmeyen kısmı. */
export async function rotalariGetir(): Promise<RotaOzet[]> {
  const rotalar = await prisma.rota.findMany({
    where: { aktif: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      ad: true,
      aciklama: true,
      duraklar: {
        orderBy: { sira: "asc" },
        select: {
          id: true,
          businessId: true,
          business: { select: { slug: true, name: true, logoUrl: true } },
        },
      },
    },
  });

  return rotalar.map((r) => ({
    id: r.id,
    slug: r.slug,
    ad: r.ad,
    aciklama: r.aciklama,
    duraklar: r.duraklar.map((d) => ({
      id: d.id,
      businessId: d.businessId,
      slug: d.business.slug,
      ad: d.business.name,
      logoUrl: gorselAdresi(d.businessId, "logo", d.business.logoUrl),
    })),
  }));
}

export async function rotaGetir(slug: string): Promise<RotaOzet | null> {
  const r = await prisma.rota.findFirst({
    where: { slug, aktif: true },
    select: {
      id: true,
      slug: true,
      ad: true,
      aciklama: true,
      duraklar: {
        orderBy: { sira: "asc" },
        select: {
          id: true,
          businessId: true,
          business: { select: { slug: true, name: true, logoUrl: true } },
        },
      },
    },
  });
  if (!r) return null;

  return {
    id: r.id,
    slug: r.slug,
    ad: r.ad,
    aciklama: r.aciklama,
    duraklar: r.duraklar.map((d) => ({
      id: d.id,
      businessId: d.businessId,
      slug: d.business.slug,
      ad: d.business.name,
      logoUrl: gorselAdresi(d.businessId, "logo", d.business.logoUrl),
    })),
  };
}
