export function PageShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="px-8 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
      Lands in {phase}.
    </div>
  );
}
