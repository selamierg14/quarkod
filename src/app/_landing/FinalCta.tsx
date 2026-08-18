import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-ink py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 text-center">
        <h2 className="text-display font-semibold text-white">
          Bugün başlayın, 2 dakikada kurulur
        </h2>
        <p className="max-w-xl text-body text-white/70">
          7 gün ücretsiz deneyin; ilk masanızın QR kodu hesabınız açılır açılmaz hazır
          olur.
        </p>
        <ButtonLink href="/deneme" size="lg" variant="brand">
          7 gün ücretsiz dene
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}
