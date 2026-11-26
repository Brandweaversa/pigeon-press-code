"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookmarkX, BellOff, LogIn } from "lucide-react";
import { api, post, patch } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useSession } from "next-auth/react";
import { LogoSkeleton, SectionTitle, EmptyState, fmtDate, imgSrc } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/* ---------------- Saved (favourites) ---------------- */

type Fav = {
  id: string;
  notify: boolean;
  magazine: {
    id: string;
    name: string;
    logoImageId: string;
    category?: { id: string; name: string } | null;
    publisher?: { companyName: string } | null;
    latestEdition?: { id: string; title: string; publishedAt?: string | null } | null;
  };
};

export function SavedView() {
  const { data: session } = useSession();
  const push = useApp((s) => s.push);
  const qc = useQueryClient();

  const { data: favs, isLoading } = useQuery({
    queryKey: ["favourites"],
    queryFn: () => api<Fav[]>("/api/favourites"),
    enabled: !!session?.user,
  });

  const toggleNotify = useMutation({
    mutationFn: (f: Fav) => patch<{ notify: boolean }>("/api/favourites", { magazineId: f.magazine.id, notify: !f.notify }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favourites"] });
      toast.success("Notification preference updated.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const unfav = useMutation({
    mutationFn: (f: Fav) => post<{ favourited: boolean }>("/api/favourites", { magazineId: f.magazine.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favourites"] });
      toast.success("Removed from saved.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!session?.user) {
    return (
      <EmptyState
        icon={<LogIn className="h-6 w-6" />}
        title="Sign in to save favourites"
        hint="Your saved magazines and alerts live here once you are signed in."
        action={<Button onClick={() => push({ name: "auth" })}>Sign in</Button>}
      />
    );
  }
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <LogoSkeleton key={i} />)}
      </div>
    );
  }
  if (!favs || favs.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkX className="h-6 w-6" />}
        title="Nothing saved yet"
        hint="Tap the bookmark on any magazine to keep it here and get alerts for new editions."
        action={<Button variant="outline" onClick={() => push({ name: "discover" })}>Discover editions</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle sub="Your saved magazines — flip the switch to get alerts for new editions">Saved</SectionTitle>
      <ul className="space-y-2">
        {favs.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-black/5">
            <button onClick={() => push({ name: "magazine", params: { id: f.magazine.id } })} className="shrink-0" aria-label={`Open ${f.magazine.name}`}>
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/10">
                <img src={imgSrc(f.magazine.logoImageId, "/icons/icon-192.png")} alt="" className="h-full w-full object-contain" />
              </div>
            </button>
            <div className="min-w-0 flex-1">
              <button onClick={() => push({ name: "magazine", params: { id: f.magazine.id } })} className="block max-w-full text-left">
                <p className="truncate font-semibold text-black">{f.magazine.name}</p>
                <p className="truncate text-xs text-black/50">
                  {f.magazine.category?.name || "Magazine"}
                  {f.magazine.latestEdition ? ` · latest: ${f.magazine.latestEdition.title}` : ""}
                </p>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-black/55" title="Notify me about new editions">
                <BellOff className="h-3.5 w-3.5" />
                <Switch checked={f.notify} onCheckedChange={() => toggleNotify.mutate(f)} aria-label="Notify about new editions" />
              </label>
              <Button size="icon" variant="ghost" className="text-black/40 hover:text-red-600" onClick={() => unfav.mutate(f)} aria-label={`Remove ${f.magazine.name}`}>
                <BookmarkX className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Alerts (notifications) ---------------- */

type Notif = { id: string; title: string; body: string; read: boolean; createdAt: string };

export function AlertsView() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ unread: number; items: Notif[] }>("/api/notifications"),
    enabled: !!session?.user,
    refetchInterval: 30_000,
  });

  const markAll = useMutation({
    mutationFn: () => post("/api/notifications", { all: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!session?.user) {
    return (
      <EmptyState
        icon={<LogIn className="h-6 w-6" />}
        title="Sign in to see alerts"
        hint="We notify you in-app when a magazine you saved releases a new edition."
        action={<Button onClick={() => useApp.getState().push({ name: "auth" })}>Sign in</Button>}
      />
    );
  }
  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  const items = data?.items || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle sub="New editions and platform updates">{data?.unread ? `${data.unread} unread` : "Alerts"}</SectionTitle>
        {items.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => markAll.mutate()} className="text-primary">
            Mark all read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<BellOff className="h-6 w-6" />} title="No alerts yet" hint="Save magazines with notifications on and new editions will show up here." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl p-4 ring-1 ring-inset ${n.read ? "bg-white/70 ring-black/5" : "bg-primary/5 ring-primary/25"}`}
            >
              <div className="flex items-baseline gap-2">
                <p className="font-semibold text-black">{n.title}</p>
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="unread" />}
                <span className="ml-auto shrink-0 text-xs text-black/45">{fmtDate(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-black/65">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
