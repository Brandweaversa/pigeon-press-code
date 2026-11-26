"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Bookmark, BookmarkCheck, CalendarDays, History } from "lucide-react";
import { api, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useSession } from "next-auth/react";
import {
  imgSrc,
  EditionThumb,
  PublisherCard,
  EmptyState,
  fmtDate,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MagazineRef = {
  id: string;
  name: string;
  logoImageId?: string | null;
  frequency?: string | null;
  category?: { id: string; name: string } | null;
};

type EditionDetail = {
  id: string;
  title: string;
  issueNumber?: string | null;
  flipbookUrl: string;
  thumbnailImageId: string;
  publishedAt?: string | null;
  magazine: MagazineRef;
  publisher: {
    id: string;
    companyName: string;
    logoImageId?: string | null;
    contactEmail?: string | null;
    about?: string | null;
  };
  previousEditions: {
    id: string;
    title: string;
    issueNumber?: string | null;
    thumbnailImageId: string;
    sortOrder: number;
    publishedAt?: string | null;
  }[];
  favourited?: boolean;
  isOwner?: boolean;
};

export function EditionView({ id }: { id: string }) {
  const { data: session } = useSession();
  const push = useApp((s) => s.push);
  const openReader = useApp((s) => s.openReader);
  const qc = useQueryClient();

  const { data: ed, isLoading, error } = useQuery({
    queryKey: ["edition", id],
    queryFn: () => api<EditionDetail>(`/api/editions/${id}`),
  });

  const favMut = useMutation({
    mutationFn: (magazineId: string) => post<{ favourited: boolean }>("/api/favourites", { magazineId }),
    onSuccess: (r) => {
      toast.success(r.favourited ? "Added to your saved magazines." : "Removed from saved.");
      qc.invalidateQueries({ queryKey: ["edition", id] });
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (error || !ed) {
    return <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Edition unavailable" hint={(error as Error)?.message} />;
  }

  const open = () =>
    openReader({ url: ed.flipbookUrl, title: ed.title, magazine: ed.magazine.name });
  const openEdition = (editionId: string) => push({ name: "edition", params: { id: editionId } });

  return (
    <div className="space-y-8">
      {/* full-width thumbnail */}
      <div className="w-full overflow-hidden rounded-3xl bg-muted shadow-xl ring-1 ring-black/10">
        <img
          src={imgSrc(ed.thumbnailImageId, "/icons/icon-192.png")}
          alt={`${ed.title} thumbnail`}
          className="h-auto w-full object-cover"
        />
      </div>

      {/* the edition's story */}
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-black/55">
            {ed.magazine.category && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">{ed.magazine.category.name}</span>
            )}
            {ed.issueNumber && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-0.5 font-medium">
                Issue {ed.issueNumber}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(ed.publishedAt)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-black">{ed.title}</h1>
          <button
            onClick={() => push({ name: "magazine", params: { id: ed.magazine.id } })}
            className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {ed.magazine.logoImageId ? (
              <img src={imgSrc(ed.magazine.logoImageId)} alt="" className="h-5 w-5 rounded object-contain ring-1 ring-black/10" />
            ) : null}
            {ed.magazine.name}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={open} className="gap-2">
            <BookOpen className="h-4 w-4" /> Read edition
          </Button>
          {session?.user ? (
            <Button
              variant="outline"
              onClick={() => favMut.mutate(ed.magazine.id)}
              disabled={favMut.isPending}
              className={cn("gap-2", ed.favourited && "border-primary text-primary")}
            >
              {ed.favourited ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {ed.favourited ? "Saved" : "Save magazine"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => useApp.getState().push({ name: "auth" })} className="gap-2">
              <Bookmark className="h-4 w-4" /> Sign in to save
            </Button>
          )}
        </div>
      </div>

      {/* previous editions, in the publisher's display order */}
      {ed.previousEditions.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-black">
            <History className="h-4.5 w-4.5 text-primary" /> Previous editions
          </h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
            {ed.previousEditions.map((p, i) => (
              <EditionThumb key={p.id} ed={p} index={i} size="sm" onOpen={openEdition} />
            ))}
          </div>
        </section>
      )}

      {/* publisher info + contact details */}
      <PublisherCard publisher={ed.publisher} />
    </div>
  );
}
