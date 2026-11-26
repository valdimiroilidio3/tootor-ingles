"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, BookOpen, Flame, Home, Layers, MessageCircle, Mic, MoreHorizontal, Route, Settings, X, Zap } from "lucide-react";
import { useApp } from "./AppProvider";
import { Mascot } from "./Mascot";
import { Notice, Spinner } from "./ui";
import { cn } from "@/lib/util";
import { useDerived } from "@/lib/useDerived";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: Route },
  { href: "/practice", label: "Practice", icon: Mic },
  { href: "/tutor", label: "Tutor", icon: MessageCircle },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/review", label: "Review", icon: Layers },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const PRIMARY_MOBILE = NAV.slice(0, 4);
const MORE_MOBILE = NAV.slice(4);

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-xl" aria-label="Lumo English home">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-black shadow-soft" aria-hidden>
        L
      </span>
      <span className="text-lg font-extrabold tracking-tight">Lumo English</span>
    </Link>
  );
}

function TopStats() {
  const d = useDerived();
  if (!d) return null;
  return (
    <div className="flex items-center gap-2 text-sm font-extrabold">
      <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-soft" title="Current streak">
        <Flame className="size-4 text-[#e8590c]" aria-hidden /> {d.streak.current}
        <span className="sr-only">day streak</span>
      </span>
      <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 shadow-soft" title="Total XP">
        <Zap className="size-4 text-[#b89b00]" aria-hidden /> {d.xp}
        <span className="sr-only">XP</span>
      </span>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, data, storageError, dismissStorageError } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreDialogRef = useRef<HTMLDivElement>(null);

  const onboarded = Boolean(data.settings?.onboarded);
  const isOnboarding = pathname === "/onboarding";
  const isLesson = pathname.startsWith("/lesson/");

  useEffect(() => {
    if (status === "ready" && !onboarded && !isOnboarding) router.replace("/onboarding");
  }, [status, onboarded, isOnboarding, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    const dialog = moreDialogRef.current;
    const trigger = moreTriggerRef.current;
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []).filter((el) => el.tabIndex >= 0);
    document.body.style.overflow = "hidden";
    focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
      } else if (event.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [moreOpen]);

  if (status === "loading" || (!onboarded && !isOnboarding)) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center">
          <Mascot mood="thinking" size={110} />
          <Spinner label="Loading your learning space…" />
        </div>
      </main>
    );
  }

  const banner = storageError && (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <Notice
        tone="danger"
        title="Storage problem"
        action={
          <button onClick={dismissStorageError} className="font-bold underline">
            Dismiss
          </button>
        }
      >
        {storageError}
      </Notice>
    </div>
  );

  if (isOnboarding || isLesson) {
    return (
      <>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:font-bold">Skip to lesson content</a>
        {banner}
        <main id="main">{children}</main>
      </>
    );
  }

  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:font-bold">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white/60 p-5 md:flex">
        <Brand />
        <nav aria-label="Main" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-bold transition-colors", active ? "bg-brand text-ink shadow-soft" : "text-ink/75 hover:bg-black/5")}
              >
                <Icon className="size-5" aria-hidden /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-cream p-3">
          <Mascot size={44} float={false} />
          <p className="text-xs leading-snug text-muted">Private & offline-first. Your data stays in this browser.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="safe-top sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/95 px-4 pb-3 backdrop-blur md:hidden">
          <Brand />
          <TopStats />
        </div>
        {banner}
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {PRIMARY_MOBILE.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold">
                  <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-brand")}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button ref={moreTriggerRef} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className="flex min-h-12 w-full flex-col items-center gap-0.5 py-1 text-[11px] font-bold">
              <span className={cn("grid h-8 w-14 place-items-center rounded-full", MORE_MOBILE.some((n) => isActive(pathname, n.href)) && "bg-brand")}>
                <MoreHorizontal className="size-5" aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/40" onClick={() => setMoreOpen(false)} />
            <motion.div
              ref={moreDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-menu-title"
              className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-pop"
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p id="more-menu-title" className="text-lg font-extrabold">More</p>
                <button onClick={() => setMoreOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-cream">
                  <X className="size-5" />
                </button>
              </div>
              <div className="grid gap-2">
                {MORE_MOBILE.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-4 text-[15px] font-bold">
                    <Icon className="size-5" aria-hidden /> {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
