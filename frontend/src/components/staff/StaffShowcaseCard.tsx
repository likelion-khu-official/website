import type { Staff } from '@shared/types/staff';

export default function StaffShowcaseCard({
  staff,
  mode = 'responsive',
}: {
  staff: Staff;
  mode?: 'responsive' | 'desktop' | 'mobile';
}) {
  const photoSize =
    mode === 'mobile'
      ? 'h-28 w-28'
      : mode === 'desktop'
        ? 'h-[clamp(82px,8vw,132px)] w-[clamp(82px,8vw,132px)]'
        : 'h-28 w-28 min-[400px]:h-32 min-[400px]:w-32 sm:h-28 sm:w-28 lg:h-32 lg:w-32 xl:h-[clamp(132px,10vw,168px)] xl:w-[clamp(132px,10vw,168px)]';

  return (
    <article className="group flex h-full min-h-0 flex-col items-center px-2 pb-5 text-center">
      <div
        className={`relative overflow-hidden rounded-full ring-1 ring-white/10 transition-[box-shadow,transform] duration-300 group-hover:ring-accent/50 ${photoSize}`}
      >
        <div className="h-full w-full overflow-hidden bg-gradient-to-br from-[#3f251d] to-[#1b1716]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={staff.photoUrl} alt={`${staff.name} 프로필`} className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="flex min-w-0 w-full flex-col items-center pt-3 xl:pt-4">
        <div className="min-w-0">
          <h3
            className={`font-bold tracking-[-0.05em] text-white transition-colors group-hover:text-accent ${
              mode === 'mobile'
                ? 'text-lg'
                : mode === 'desktop'
                  ? 'text-[clamp(14px,1.2vw,18px)]'
                  : 'text-lg xl:text-xl xl:group-hover:text-white'
            }`}
          >
            {staff.name}
          </h3>
          <p className="mt-0.5 truncate text-[9px] text-white/35 sm:text-[10px]">
            {staff.department} · {staff.admissionYear}
          </p>
        </div>
        <p className="mt-0.5 min-w-0 break-keep text-[11px] font-bold leading-snug tracking-[0.02em] text-accent xl:mt-2 xl:min-h-[30px] xl:px-1">
          {staff.position}
        </p>
      </div>
    </article>
  );
}
