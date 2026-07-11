export default function NoticeScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-muted">{description}</p>
      {children}
    </div>
  );
}
