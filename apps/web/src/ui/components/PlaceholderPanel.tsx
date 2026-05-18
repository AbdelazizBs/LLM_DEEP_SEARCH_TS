type PlaceholderPanelProps = {
  children: string;
};

export function PlaceholderPanel({ children }: PlaceholderPanelProps) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
      {children}
    </div>
  );
}
