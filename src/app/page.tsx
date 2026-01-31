import { WaitlistForm } from "@/components/WaitlistForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated mesh gradient background */}
      {/* Animated mesh gradient overlay - base #0f172a from body */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(71, 85, 105, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(30, 41, 59, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 50% 50%, rgba(51, 65, 85, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 70% 30% at 90% 10%, rgba(71, 85, 105, 0.5) 0%, transparent 40%)
          `,
          backgroundSize: "200% 200%",
          animation: "mesh-gradient-shift 20s ease infinite",
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 flex flex-col flex-1 min-h-screen">
        {/* Hero Section */}
        <section
          className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32 border-b border-white/[0.1]"
          aria-labelledby="hero-heading"
        >
          <div className="max-w-4xl mx-auto text-center">
            <h1
              id="hero-heading"
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-6"
            >
              The National Standard for Parliamentary Accountability.
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12">
              Digitizing the connection between financial disclosures and
              legislative outcomes in Canada.
            </p>
            <WaitlistForm />
          </div>
        </section>

        {/* Mission Tiles */}
        <section
          className="px-6 py-20 md:py-24 border-b border-white/[0.1]"
          aria-labelledby="mission-heading"
        >
          <h2 id="mission-heading" className="sr-only">
            Our Mission
          </h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <article
              className="p-8 border border-white/[0.1] rounded-sm bg-white/[0.02]"
              aria-labelledby="tile-1-heading"
            >
              <h3
                id="tile-1-heading"
                className="font-serif text-xl font-semibold text-white mb-3"
              >
                Scrubbed Primary Data
              </h3>
              <p className="text-white/70 text-base leading-relaxed">
                Sourced directly from the CIEC and LEGISinfo.
              </p>
            </article>
            <article
              className="p-8 border border-white/[0.1] rounded-sm bg-white/[0.02]"
              aria-labelledby="tile-2-heading"
            >
              <h3
                id="tile-2-heading"
                className="font-serif text-xl font-semibold text-white mb-3"
              >
                Non-Partisan Algorithms
              </h3>
              <p className="text-white/70 text-base leading-relaxed">
                Open-source logic for interest correlation.
              </p>
            </article>
            <article
              className="p-8 border border-white/[0.1] rounded-sm bg-white/[0.02]"
              aria-labelledby="tile-3-heading"
            >
              <h3
                id="tile-3-heading"
                className="font-serif text-xl font-semibold text-white mb-3"
              >
                Citizens First
              </h3>
              <p className="text-white/70 text-base leading-relaxed">
                Optimized for WCAG 2.1 accessibility and screen-readers.
              </p>
            </article>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="px-6 py-8 text-center border-t border-white/[0.1]"
          role="contentinfo"
        >
          <p className="text-xs text-white/50">
            A Civic-Tech Initiative | IntegrityIndex.ca &copy; 2026
          </p>
        </footer>
      </main>
    </div>
  );
}
