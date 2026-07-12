export default function Thumbnail() {
  return (
    <section
      id="thumbnail"
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden hero-thumbnail-bg"
    >
      <div className="hero-glow-layer hero-glow-layer--1" />
      <div className="hero-glow-layer hero-glow-layer--2">
        <div className="hero-glow-layer--2-right" />
      </div>
      <div className="hero-glow-layer hero-glow-layer--3">
        <div className="hero-glow-layer--3-topleft" />
      </div>

      <div className="relative flex flex-col items-center gap-2 text-center px-6">
        <p className="text-[#cdcdcd] text-xl md:text-[32px] tracking-[-0.64px]">
          Kyunghee Univ. Like Lions
        </p>
        <div
          className="flex flex-col items-center gap-1"
          style={{ fontFamily: 'var(--font-gremlin-trial)' }}
        >
          <p className="text-white text-6xl md:text-[90px] tracking-[-2.25px] leading-none">
            Possibility
          </p>
          <p className="text-accent/40 text-3xl md:text-[50px] tracking-[-1.25px] leading-none">
            to reality
          </p>
        </div>
      </div>
    </section>
  );
}
