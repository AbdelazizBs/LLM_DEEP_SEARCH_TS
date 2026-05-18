type PageHeaderProps = {
  title: string;
};

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="mb-5 border-b border-neutral-200 pb-4">
      <p className="text-sm font-medium text-neutral-500">Deep Dive Research Agent</p>
      <h1 className="mt-1 text-2xl font-semibold text-neutral-950">{title}</h1>
    </header>
  );
}
