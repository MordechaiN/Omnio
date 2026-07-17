import type { ReactNode } from "react";

/** The centred, branded frame for every pre-login screen (setup, login, splash). */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-(--motion-base) ease-(--ease-out)">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg shadow-1">
            O
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-text-muted text-pretty">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
