"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

export const imgSrc = (id?: string | null, fallback = "/icons/logo-mark.png") =>
  id ? `/api/images/${id}` : fallback;

/* ---------------- magazine cards ---------------- */

export type MagazineCardData = {
  id: string;
  name: string;
  logoImageId: string;
  featured?: boolean;
  category?: { id: string; name: string } | null;
  publisher?: { id?: string; companyName: string } | null;
  editionsCount?: number;
};

/** Magazine logo tile — the brand is the card. */
export function LogoCard({
  mag,
  onOpen,
  index = 0,
}: {
  mag: MagazineCardData;
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
      aria-label={`Open ${mag.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-xl">
        <img
          src={imgSrc(mag.logoImageId, "/icons/icon-192.png")}
          alt={`${mag.name} logo`}
          loading="lazy"
          className="h-full w-full object-contain"
        />
        {mag.featured && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground shadow">★ Featured</Badge>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-semibold text-black">{mag.name}</p>
        <p className="truncate text-xs text-black/55">
          {mag.publisher?.companyName || mag.category?.name || "Magazine"}
        </p>
      </div>
    </motion.button>
  );
}

export function LogoSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/* ---------------- edition cards ---------------- */

export type EditionCardData = {
  id: string;
  title: string;
  issueNumber?: string | null;
  thumbnailImageId: string;
  publishedAt?: string | Date | null;
  magazine: { id: string; name: string; logoImageId?: string | null; category?: { id: string; name: string } | null };
  publisher?: { id?: string; companyName: string } | null;
};

/** Edition thumbnail card (free ratio — height follows the image). */
export function EditionCard({
  ed,
  onOpen,
  index = 0,
}: {
  ed: EditionCardData;
  onOpen: (id: string) => void;
  index?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(ed.id)}
      className="group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      aria-label={`Open ${ed.title}`}
    >
      <div className="w-full overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-black/5 transition-shadow group-hover:shadow-xl">
        <img
          src={imgSrc(ed.thumbnailImageId, "/icons/icon-192.png")}
          alt={`${ed.title} thumbnail`}
          loading="lazy"
          className="h-auto w-full object-cover"
        />
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-semibold text-black">
          {ed.title}
          {ed.issueNumber ? <span className="font-normal text-black/50"> · {ed.issueNumber}</span> : null}
        </p>
        <p className="truncate text-xs text-black/55">
          {ed.magazine.name}
          {ed.publisher ? ` · ${ed.publisher.companyName}` : ""}
        </p>
      </div>
    </motion.button>
  );
}

/** Small edition thumbnail used in "previous editions" strips. */
export function EditionThumb({
  ed,
  onOpen,
  index = 0,
  size = "md",
}: {
  ed: Pick<EditionCardData, "id" | "title" | "issueNumber" | "thumbnailImageId">;
  onOpen: (id: string) => void;
  index?: number;
  size?: "sm" | "md";
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.3, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onOpen(ed.id)}
      className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      aria-label={`Open ${ed.title}`}
    >
      <div className="w-full overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 transition-shadow group-hover:shadow-lg">
        <img
          src={imgSrc(ed.thumbnailImageId, "/icons/icon-192.png")}
          alt={`${ed.title} thumbnail`}
          loading="lazy"
          className="h-auto w-full object-cover"
        />
      </div>
      <p className={`mt-1.5 truncate font-semibold text-black ${size === "sm" ? "text-xs" : "text-sm"}`}>{ed.title}</p>
      {ed.issueNumber ? <p className="truncate text-[11px] text-black/50">{ed.issueNumber}</p> : null}
    </motion.button>
  );
}

export function EditionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/* ---------------- publisher info ---------------- */

export type PublisherInfo = {
  id?: string;
  companyName: string;
  logoImageId?: string | null;
  contactEmail?: string | null;
  about?: string | null;
};

/** Publisher identity + contact details block. */
export function PublisherCard({ publisher, title = "Published by" }: { publisher: PublisherInfo; title?: string }) {
  return (
    <div className="rounded-3xl bg-white/85 p-5 ring-1 ring-black/5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/45">{title}</p>
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-black/5">
          {publisher.logoImageId ? (
            <img src={imgSrc(publisher.logoImageId)} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-lg font-bold text-primary">{publisher.companyName.slice(0, 1)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-black">{publisher.companyName}</p>
          {publisher.about ? <p className="mt-1 text-sm leading-relaxed text-black/65">{publisher.about}</p> : null}
          {publisher.contactEmail ? (
            <a
              href={`mailto:${publisher.contactEmail}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> {publisher.contactEmail}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-900 ring-emerald-600/20",
  PENDING: "bg-amber-100 text-amber-900 ring-amber-600/25",
  REJECTED: "bg-red-100 text-red-900 ring-red-600/20",
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
      <h2 className="text-[2.5rem] md:text-[3rem] font-bold tracking-tight text-black">{children}</h2>
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
