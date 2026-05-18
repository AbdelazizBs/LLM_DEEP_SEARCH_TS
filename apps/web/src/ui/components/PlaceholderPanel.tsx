type PlaceholderPanelProps = {
  children: string;
};

export function PlaceholderPanel({ children }: PlaceholderPanelProps) {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
      {children}
    </div>
  );
}
