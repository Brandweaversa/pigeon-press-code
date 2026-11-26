"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const imgSrc = (id?: string | null, fallback = "/icons/logo-mark.png") =>
  id ? `/api/images/${id}` : fallback;

export type MagCardData = {
  id: string;
  title: string;
  coverImageId: string;
  category?: { id: string; name: string } | null;
  publisher?: { companyName: string } | null;
  latestEdition?: { title: string; publishedAt?: string | Date | null } | null;
  featured?: boolean;
};

/** A4-ratio magazine cover card (never stretches; object-cover). */
export function MagCard({
  mag,
  onOpen,
  index = 0,
}: {
  mag: MagCardData;
  onOpen: (id: string) => void;
  index?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(mag.id)}
      className="group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      aria-label={`Open ${mag.title}`}
    >
      <div className="relative a4 w-full overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-xl">
        {/* A4 placeholder blocks while the cover loads */}
        <img
          src={imgSrc(mag.coverImageId, "/icons/icon-192.png")}
          alt={`${mag.title} cover`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {mag.featured && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground shadow">
            ★ Featured
          </Badge>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-semibold text-black">{mag.title}</p>
        <p className="truncate text-xs text-black/55">
          {mag.category?.name || "Magazine"}
          {mag.publisher ? ` · ${mag.publisher.companyName}` : ""}
        </p>
      </div>
    </motion.button>
  );
}

export function CoverSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="a4 w-full rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-900 ring-emerald-600/20",
  PENDING: "bg-amber-100 text-amber-900 ring-amber-600/25",
  REJECTED: "bg-red-100 text-red-900 ring-red-600/20",
  DRAFT: "bg-zinc-200 text-zinc-700 ring-zinc-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status] || "bg-zinc-200 text-zinc-700"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-black">{children}</h2>
      {sub ? <p className="text-sm text-black/55 mt-0.5">{sub}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/15 bg-white/60 px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <p className="font-semibold text-black">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-black/55">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function fmtDate(d?: string | Date | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
