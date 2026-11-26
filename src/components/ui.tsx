"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/util";

type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-ink border-b-4 border-brand-dark hover:brightness-105 active:border-b-0 active:translate-y-1",
  secondary: "bg-white text-ink border border-line border-b-4 hover:bg-cream active:border-b active:translate-y-0.5",
  dark: "bg-ink text-white border-b-4 border-black hover:bg-black active:border-b-0 active:translate-y-1",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  danger: "bg-danger text-white border-b-4 border-[#9d2f1f] hover:brightness-105 active:border-b-0 active:translate-y-1",
  success: "bg-success text-white border-b-4 border-[#237a45] hover:brightness-105 active:border-b-0 active:translate-y-1",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-14 px-8 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 select-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClasses(variant, size, className)} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-3xl border border-line bg-white p-5 shadow-soft", className)}>{children}</Tag>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function ProgressBar({ value, className, label, tone = "brand" }: { value: number; className?: string; label?: string; tone?: "brand" | "success" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn("h-3 w-full overflow-hidden rounded-full bg-ink/10", className)}
    >
      <div className={cn("h-full rounded-full transition-all duration-500", tone === "brand" ? "bg-brand ring-1 ring-inset ring-black/10" : "bg-success")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-ink/5 text-ink",
    brand: "bg-brand text-ink",
    success: "bg-success-soft text-[#1d6b3c]",
    danger: "bg-danger-soft text-danger",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold", tones[tone], className)}>{children}</span>;
}

export function EmptyState({ title, text, action, icon }: { title: string; text: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-3xl" aria-hidden>{icon}</div>}
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-24 text-muted">
      <Loader2 className="size-8 animate-spin" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function Notice({ tone = "warning", title, children, action }: { tone?: "warning" | "info" | "danger"; title?: string; children: ReactNode; action?: ReactNode }) {
  const tones = {
    warning: "bg-brand-soft border-brand-dark/40",
    info: "bg-white border-line",
    danger: "bg-danger-soft border-danger/30",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl border p-4 text-sm", tones[tone])}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">
        {title && <p className="font-bold">{title}</p>}
        <div className="text-ink/85">{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-extrabold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function StatTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
        <span className="text-ink" aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
