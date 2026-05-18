import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

type PageShellProps = {
  children: ReactNode;
  maxWidth?: "5xl" | "6xl";
  title: string;
};

const maxWidthClass = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} satisfies Record<NonNullable<PageShellProps["maxWidth"]>, string>;

export function PageShell({ children, maxWidth = "5xl", title }: PageShellProps) {
  return (
    <main className={`mx-auto min-h-screen px-5 py-6 ${maxWidthClass[maxWidth]}`}>
      <PageHeader title={title} />
      {children}
    </main>
  );
}
