export default function Thumbnail() {
  return (
    <section
      id="thumbnail"
      className="hero-thumbnail-bg relative flex min-h-screen min-h-[100svh] w-full items-center justify-center overflow-hidden px-5 pt-16"
    >
      <div className="hero-glow-layer hero-glow-layer--1" />
      <div className="hero-glow-layer hero-glow-layer--2">
        <div className="hero-glow-layer--2-right" />
      </div>
      <div className="hero-glow-layer hero-glow-layer--3">
        <div className="hero-glow-layer--3-topleft" />
      </div>

      <div className="relative flex max-w-full flex-col items-center gap-2 text-center">
        <p className="text-base tracking-[-0.4px] text-[#cdcdcd] sm:text-xl sm:tracking-[-0.64px] md:text-[32px]">
          Kyunghee Univ. Like Lions
        </p>
        <div
          className="flex max-w-full flex-col items-center gap-1"
          style={{ fontFamily: 'var(--font-gremlin-trial)' }}
        >
          <p className="max-w-full whitespace-nowrap text-[clamp(40px,13.5vw,90px)] leading-none tracking-[-0.025em] text-white">
            Possibility
          </p>
          <p className="text-[clamp(26px,7.5vw,50px)] leading-none tracking-[-0.025em] text-accent/40">
            to reality
          </p>
        </div>
      </div>
    </section>
  );
}
