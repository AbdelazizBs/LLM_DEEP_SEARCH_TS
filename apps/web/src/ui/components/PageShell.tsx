import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

type PageShellProps = {
  children: ReactNode;
  description?: string;
  maxWidth?: "5xl" | "6xl";
  title: string;
};

const maxWidthClass = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} satisfies Record<NonNullable<PageShellProps["maxWidth"]>, string>;

export function PageShell({ children, description, maxWidth = "5xl", title }: PageShellProps) {
  return (
    <main className={`mx-auto min-h-screen px-4 py-5 sm:px-6 sm:py-7 ${maxWidthClass[maxWidth]}`}>
      <PageHeader description={description} title={title} />
      {children}
    </main>
  );
}
