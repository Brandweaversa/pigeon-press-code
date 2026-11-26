"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, BookOpen, ExternalLink, Globe, CalendarDays, ArrowLeft, Send } from "lucide-react";
import { api, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useSession } from "next-auth/react";
import { imgSrc, StatusBadge, EmptyState, fmtDate } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Edition = {
  id: string;
  title: string;
  issueNumber?: string | null;
  flipbookUrl: string;
  status?: string;
  publishedAt?: string | null;
  rejectionReason?: string | null;
};

type MagazineDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  featured: boolean;
  rejectionReason?: string | null;
  coverImageId: string;
  flipbookUrl: string;
  language: string;
  frequency?: string | null;
  website?: string | null;
  category?: { id: string; name: string } | null;
  publisher: { id: string; companyName: string; logoImageId?: string | null };
  editions: Edition[];
  favourited?: boolean;
  isOwner?: boolean;
};

export function MagazineView({ id }: { id: string }) {
  const { data: session } = useSession();
  const openReader = useApp((s) => s.openReader);
  const qc = useQueryClient();

  const { data: mag, isLoading, error } = useQuery({
    queryKey: ["magazine", id],
    queryFn: () => api<MagazineDetail>(`/api/magazines/${id}`),
  });

  const favMut = useMutation({
    mutationFn: () => post<{ favourited: boolean }>("/api/favourites", { magazineId: id }),
    onSuccess: (r) => {
      toast.success(r.favourited ? "Added to your saved magazines." : "Removed from saved.");
      qc.invalidateQueries({ queryKey: ["magazine", id] });
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <Skeleton className="a4 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }
  if (error || !mag) {
    return <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Magazine unavailable" hint={(error as Error)?.message} />;
  }

  const approvedEditions = mag.editions.filter((e) => e.status === "APPROVED" || mag.isOwner);

  const open = (ed: Edition) =>
    openReader({ url: ed.flipbookUrl, title: ed.title, magazine: mag.title });

  return (
    <div className="space-y-6">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        {/* A4 cover */}
        <div className="mx-auto w-56 md:w-full">
          <div className="a4 overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/10">
            <img src={imgSrc(mag.coverImageId, "/icons/icon-192.png")} alt={`${mag.title} cover`} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={mag.status} />
              {mag.featured && (
                <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  ★ Featured
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-black">{mag.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black/60">
              <span className="inline-flex items-center gap-1.5">
                {mag.publisher.logoImageId ? (
                  <img src={imgSrc(mag.publisher.logoImageId)} alt="" className="h-4 w-4 object-contain" />
                ) : null}
                {mag.publisher.companyName}
              </span>
              {mag.category && <span>{mag.category.name}</span>}
              {mag.frequency && <span>{mag.frequency}</span>}
              <span>{mag.language}</span>
            </div>
          </div>

          {mag.description ? <p className="max-w-2xl text-sm leading-relaxed text-black/75">{mag.description}</p> : null}

          {mag.status === "REJECTED" && mag.rejectionReason && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-inset ring-red-600/20">
              <span className="font-semibold">Not approved: </span>
              {mag.rejectionReason}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {approvedEditions.length > 0 && (
              <Button onClick={() => open(approvedEditions[0])} className="gap-2">
                <BookOpen className="h-4 w-4" /> Read latest edition
              </Button>
            )}
            {session?.user ? (
              <Button
                variant="outline"
                onClick={() => favMut.mutate()}
                disabled={favMut.isPending}
                className={cn("gap-2", mag.favourited && "border-primary text-primary")}
              >
                {mag.favourited ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {mag.favourited ? "Saved" : "Save"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => useApp.getState().push({ name: "auth" })} className="gap-2">
                <Bookmark className="h-4 w-4" /> Sign in to save
              </Button>
            )}
            {mag.website && (
              <a href={mag.website} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="gap-2 text-primary">
                  <Globe className="h-4 w-4" /> Website <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* editions */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-black">Editions</h2>
        {approvedEditions.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No editions yet" hint="New editions appear here as soon as they are approved." />
        ) : (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/5">
            {approvedEditions.map((ed) => (
              <li key={ed.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-black">
                    {ed.title}
                    {ed.issueNumber ? <span className="font-normal text-black/50"> · {ed.issueNumber}</span> : null}
                  </p>
                  <p className="text-xs text-black/50">
                    {ed.publishedAt ? `Published ${fmtDate(ed.publishedAt)}` : `Status: ${ed.status}`}
                    {ed.status && ed.status !== "APPROVED" ? " · awaiting review" : ""}
                  </p>
                  {ed.status === "REJECTED" && ed.rejectionReason ? (
                    <p className="text-xs text-red-700">Rejected: {ed.rejectionReason}</p>
                  ) : null}
                </div>
                {ed.status === "APPROVED" ? (
                  <Button size="sm" onClick={() => open(ed)} className="gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Read
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-black/45"><Send className="h-3.5 w-3.5" /> In review</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
