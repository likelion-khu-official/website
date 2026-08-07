type Props = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

/** 화면 내부 인라인 에러 알림 + 재시도. */
export default function ErrorAlert({ message, onRetry, className = '' }: Props) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-start justify-between gap-2 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-5 py-4 text-sm text-red-200 sm:flex-row sm:items-center sm:gap-4 ${className}`}
    >
      <span className="min-w-0 break-words">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
