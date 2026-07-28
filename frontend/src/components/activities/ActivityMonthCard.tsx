import type { ActivityMonth } from './activitiesData';

const gremlin = { fontFamily: 'var(--font-gremlin-trial)' };

export default function ActivityMonthCard({ month }: { month: ActivityMonth }) {
  return (
    <div
      className={`flex min-h-[168px] flex-col gap-4 rounded-[22px] border p-5 transition ${
        month.highlight ? 'border-accent/50 bg-accent/10' : 'border-white/10 bg-white/[0.025]'
      }`}
    >
      <span
        className="leading-none text-accent"
        style={{ ...gremlin, fontSize: 'clamp(26px, 2.4vw, 34px)', letterSpacing: '-0.5px' }}
      >
        {month.month}
      </span>
      {month.items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {month.items.map((item) => (
            <li key={item} className="break-keep text-sm leading-6 text-white/80">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/30">예정된 일정이 없어요.</p>
      )}
    </div>
  );
}
