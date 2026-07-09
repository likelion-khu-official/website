export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10 h-9 w-32 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[20px] border border-white/10">
            <div className="aspect-[16/9] w-full animate-pulse bg-white/10" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-5 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-full animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
