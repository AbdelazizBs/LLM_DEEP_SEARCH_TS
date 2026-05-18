type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ description, eyebrow = "Deep Dive Research Agent", title }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>

      <nav className="flex items-center gap-2 text-sm" aria-label="Primary">
        <a className="rounded-md px-3 py-2 text-muted hover:bg-surface-muted hover:text-foreground" href="/">
          Chat
        </a>
        <a className="rounded-md px-3 py-2 text-muted hover:bg-surface-muted hover:text-foreground" href="/admin">
          Admin
        </a>
        <a
          className="rounded-md px-3 py-2 text-muted hover:bg-surface-muted hover:text-foreground"
          href="http://127.0.0.1:3000/docs"
        >
          API docs
        </a>
      </nav>
    </header>
  );
}
