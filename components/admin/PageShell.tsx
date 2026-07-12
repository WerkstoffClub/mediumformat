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
    <>
      <div className="greet">
        <div>
          <h1 className="greet-h1">{title}</h1>
          {description && <p className="greet-sub">{description}</p>}
        </div>
        {actions && <div className="greet-right">{actions}</div>}
      </div>
      {children}
    </>
  );
}

export function ComingSoon({ phase }: { phase: string }) {
  return <div className="coming">Lands in {phase}.</div>;
}
