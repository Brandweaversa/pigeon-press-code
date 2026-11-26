"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, BookOpen, Star, CalendarDays, Layers } from "lucide-react";
import { api, post } from "@/lib/api";
import { withBusy } from "@/lib/busy";
import { useApp } from "@/lib/store";
import { useSession } from "next-auth/react";
import {
  imgSrc,
  EditionThumb,
  PublisherCard,
  EmptyState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Edition = {
  id: string;
  title: string;
  issueNumber?: string | null;
  thumbnailImageId: string;
  sortOrder: number;
  publishedAt?: string | null;
};

type MagazineDetail = {
  id: string;
  name: string;
  description?: string | null;
  logoImageId: string;
  frequency?: string | null;
  featured: boolean;
  category?: { id: string; name: string } | null;
  publisher: {
    id: string;
    companyName: string;
    logoImageId?: string | null;
    contactEmail?: string | null;
    about?: string | null;
  };
  editions: Edition[];
  favourited?: boolean;
  isOwner?: boolean;
};

export function MagazineView({ id }: { id: string }) {
  const { data: session } = useSession();
  const push = useApp((s) => s.push);
  const qc = useQueryClient();

  const { data: mag, isLoading, error } = useQuery({
    queryKey: ["magazine", id],
    queryFn: () => api<MagazineDetail>(`/api/magazines/${id}`),
  });

  const favMut = useMutation({
    mutationFn: () => withBusy("Updating…", () => post<{ favourited: boolean }>("/api/favourites", { magazineId: id })),
    onSuccess: (r) => {
      toast.success(r.favourited ? "Added to your saved magazines." : "Removed from saved.");
      qc.invalidateQueries({ queryKey: ["magazine", id] });
      qc.invalidateQueries({ queryKey: ["favourites"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <Skeleton className="aspect-square rounded-2xl" />
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

  const openEdition = (editionId: string) => push({ name: "edition", params: { id: editionId } });

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        {/* magazine logo / brand */}
        <div className="mx-auto w-44 md:w-full">
          <div className="aspect-square overflow-hidden rounded-3xl bg-white/90 p-5 shadow-xl ring-1 ring-black/10">
            <img src={imgSrc(mag.logoImageId, "/icons/icon-192.png")} alt={`${mag.name} logo`} className="h-full w-full object-contain" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            {mag.featured && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                <Star className="h-3 w-3 fill-current" /> Featured
              </span>
            )}
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">{mag.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black/60">
              {mag.category && <span>{mag.category.name}</span>}
              {mag.frequency && <span>{mag.frequency}</span>}
              <span>{mag.editions.length} edition{mag.editions.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          {mag.description ? <p className="max-w-2xl text-sm leading-relaxed text-black/75">{mag.description}</p> : null}

          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      </div>

      {/* editions */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-black">
          <Layers className="h-4.5 w-4.5 text-primary" /> Editions
        </h2>
        {mag.editions.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No editions yet" hint="New editions appear here as soon as the publisher releases them." />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {mag.editions.map((ed, i) => (
              <EditionThumb key={ed.id} ed={ed} index={i} onOpen={openEdition} />
            ))}
          </div>
        )}
      </section>

      {/* publisher info + contact */}
      <PublisherCard publisher={mag.publisher} />
    </div>
  );
}
