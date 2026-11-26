"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, LayoutGrid, Bookmark, Bell, UserRound, BookOpenText, ShieldCheck, X, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useLiveSettings } from "@/components/use-live-settings";
import { imgSrc } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const TABS = [
  { name: "discover", label: "Discover", icon: Compass, roles: null },
  { name: "browse", label: "Browse", icon: LayoutGrid, roles: null },
  { name: "saved", label: "Saved", icon: Bookmark, roles: null },
  { name: "alerts", label: "Alerts", icon: Bell, roles: null },
  { name: "profile", label: "Profile", icon: UserRound, roles: null },
  { name: "publisher", label: "Publish", icon: BookOpenText, roles: ["PUBLISHER"] },
  { name: "admin", label: "Admin", icon: ShieldCheck, roles: ["ADMIN"] },
] as const;

type SessionUser = { id?: string; name?: string | null; email?: string | null; role?: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const settings = useLiveSettings();
  const { current, stack, back, replace, push, reader, closeReader } = useApp();
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1400);
    return () => clearTimeout(t);
  }, []);

  const { data: notif } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ unread: number; items: { id: string }[] }>("/api/notifications"),
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const unread = notif?.unread || 0;

  const visible = TABS.filter((t) => !t.roles || (user?.role && t.roles.includes(user.role)));
  const appName = settings?.app_name || "Pigeon Press";
  const showBack = (current.name === "magazine" || current.name === "page") && stack.length > 1;

  const go = (name: (typeof TABS)[number]["name"]) => replace({ name });

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* managed background layer */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "var(--bg-image)",
          backgroundSize: "var(--bg-size)",
          backgroundPosition: "var(--bg-pos)",
          backgroundAttachment: "var(--bg-parallax)",
          opacity: "var(--bg-opacity)",
        }}
      />

      {/* splash */}
      <AnimatePresence>
        {splash && (
          <motion.div
            key="splash"
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="fixed inset-0 z-[90] grid place-items-center"
            style={{ background: "var(--splash-bg)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center gap-4"
              style={{
                alignItems:
                  settings?.splash_logo_position === "left"
                    ? "flex-start"
                    : settings?.splash_logo_position === "right"
                      ? "flex-end"
                      : "center",
              }}
            >
              <img
                src={imgSrc(settings?.splash_logo_id, "/icons/logo-mark.png")}
                alt="logo"
                className="object-contain"
                style={{
                  width:
                    settings?.splash_logo_size === "small"
                      ? 64
                      : settings?.splash_logo_size === "large"
                        ? 160
                        : 104,
                }}
              />
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-white/90 text-lg font-semibold tracking-wide"
              >
                {appName}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* top glass bar */}
      <header className="sticky top-0 z-40 glass border-b border-black/5 pt-safe">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {showBack ? (
              <button
                onClick={back}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5 text-black"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <img
                src={imgSrc(settings?.header_logo_id, "/icons/logo-mark.png")}
                alt="logo"
                className="object-contain"
                style={{
                  height:
                    settings?.header_logo_size === "small"
                      ? 22
                      : settings?.header_logo_size === "large"
                        ? 38
                        : 28,
                }}
              />
            )}
            <span className={cn("truncate font-semibold text-black", showBack ? "text-base" : "text-lg")}>
              {showBack
                ? current.name === "magazine"
                  ? "Magazine"
                  : current.params?.title || "Page"
                : appName}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => go("alerts")}
              className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 text-black"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {user ? (
              <button
                onClick={() => go("profile")}
                className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-bold uppercase"
                aria-label="Profile"
              >
                {(user.name || "U").slice(0, 1)}
              </button>
            ) : (
              <button
                onClick={() => push({ name: "auth" })}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        {/* desktop rail (mac style) */}
        <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 md:flex md:flex-col items-center gap-1 py-4 pl-2 pr-2" aria-label="Main">
          {visible.map((t) => {
            const active = current.name === t.name;
            const Icon = t.icon;
            return (
              <button
                key={t.name}
                onClick={() => go(t.name)}
                title={t.label}
                aria-label={t.label}
                className={cn(
                  "group relative grid h-11 w-11 place-items-center rounded-xl transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-black/60 hover:bg-black/5 hover:text-black"
                )}
              >
                <Icon className="h-5 w-5" />
                {t.name === "alerts" && unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* content */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:pb-10">{children}</main>
      </div>

      {/* mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 glass border-t border-black/5 pb-safe md:hidden"
        aria-label="Tab bar"
      >
        <div className="grid grid-flow-col auto-cols-fr">
          {visible.map((t) => {
            const active = current.name === t.name;
            const Icon = t.icon;
            return (
              <button
                key={t.name}
                onClick={() => go(t.name)}
                className="relative flex flex-col items-center gap-0.5 py-2 pt-2.5"
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-[22px] w-[22px] transition-colors",
                      active ? "text-primary" : "text-black/45"
                    )}
                  />
                  {t.name === "alerts" && unread > 0 && (
                    <span className="absolute -top-1 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-black/45")}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* reader overlay */}
      <AnimatePresence>
        {reader && (
          <motion.div
            key="reader"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black/95"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{reader.title}</p>
                <p className="truncate text-xs text-white/60">{reader.magazine}</p>
              </div>
              <button
                onClick={closeReader}
                className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close reader"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              src={reader.url}
              title={`${reader.magazine} — ${reader.title}`}
              className="h-full w-full flex-1 bg-white"
              allow="fullscreen"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
