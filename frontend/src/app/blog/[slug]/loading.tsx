export default function PostLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 h-9 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mb-8 h-4 w-40 animate-pulse rounded bg-white/5" />
      <div className="mb-8 aspect-[16/9] w-full animate-pulse rounded-2xl bg-white/10" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-white/5" />
        ))}
      </div>
    </div>
  );
}
