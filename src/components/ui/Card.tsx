import { type ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-4">
      {icon ? (
        <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
          {icon}
        </span>
      ) : null}
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}
