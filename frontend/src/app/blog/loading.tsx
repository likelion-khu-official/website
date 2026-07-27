export default function BlogLoading() {
  return (
    <main className="mx-auto min-h-[calc(100svh-88px)] w-full max-w-[1440px] px-5 pb-24 pt-12 sm:px-10 sm:pt-14 lg:px-16 lg:pt-24">
      <div className="h-3 w-44 animate-pulse rounded-full bg-white/10" />
      <div className="mt-7 h-24 max-w-4xl animate-pulse rounded-2xl bg-white/[0.07] sm:h-40" />
      <div className="mt-7 h-14 max-w-2xl animate-pulse rounded-xl bg-white/[0.04]" />

      <div className="mt-20 border-t border-white/10 pt-8 sm:mt-28">
        <div className="mb-9 h-4 w-20 animate-pulse rounded-full bg-white/[0.07]" />
        <div className="grid overflow-hidden rounded-[28px] border border-white/10 lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.75fr)]">
          <div className="aspect-[16/10] animate-pulse bg-white/10 lg:min-h-[430px]" />
          <div className="flex flex-col gap-5 p-8 lg:p-10">
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="mt-auto h-24 animate-pulse rounded-xl bg-white/[0.07]" />
            <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </main>
  );
}
