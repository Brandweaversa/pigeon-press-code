"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpenText, ShieldCheck, FileText, Shield, LogOut, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/shared";

type PageData = { slug: string; title: string; updatedAt: string };

export function ProfileView() {
  const { data: session } = useSession();
  const push = useApp((s) => s.push);
  const replace = useApp((s) => s.replace);
  const qc = useQueryClient();
  const user = session?.user as { id?: string; name?: string; email?: string; role?: string } | undefined;

  const { data: terms } = useQuery({ queryKey: ["page", "terms"], queryFn: () => api<PageData>("/api/pages/terms") });
  const { data: privacy } = useQuery({ queryKey: ["page", "privacy"], queryFn: () => api<PageData>("/api/pages/privacy") });

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl bg-white/85 p-6 text-center ring-1 ring-black/5">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <LogIn className="h-6 w-6" />
        </div>
        <p className="font-semibold text-black">You are browsing as a guest</p>
        <p className="text-sm text-black/55">Sign in to save favourites, get alerts, or publish your own magazines.</p>
        <Button className="w-full" onClick={() => push({ name: "auth" })}>Sign in or create account</Button>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" className="gap-2" onClick={() => push({ name: "page", params: { slug: "terms", title: terms?.title || "Terms" } })}>
            <FileText className="h-4 w-4" /> Terms
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => push({ name: "page", params: { slug: "privacy", title: privacy?.title || "Privacy" } })}>
            <Shield className="h-4 w-4" /> Privacy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-3xl bg-white/85 p-6 ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground uppercase">
            {(user.name || "U").slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-black">{user.name}</p>
            <p className="truncate text-sm text-black/55">{user.email}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {user.role === "ADMIN" ? "Platform administrator" : user.role === "PUBLISHER" ? "Publisher" : "Reader"}
        </p>
      </div>

      <div className="rounded-3xl bg-white/85 p-3 ring-1 ring-black/5">
        {user.role === "PUBLISHER" && (
          <button
            onClick={() => replace({ name: "publisher" })}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-black/5"
          >
            <BookOpenText className="h-5 w-5 text-primary" />
            <span className="flex-1 font-medium text-black">My publishing desk</span>
          </button>
        )}
        {user.role === "ADMIN" && (
          <button
            onClick={() => replace({ name: "admin" })}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-black/5"
          >
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="flex-1 font-medium text-black">Admin console</span>
          </button>
        )}
        <button
          onClick={() => push({ name: "page", params: { slug: "terms", title: terms?.title || "Terms" } })}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-black/5"
        >
          <FileText className="h-5 w-5 text-black/60" />
          <span className="flex-1 font-medium text-black">Terms and Conditions</span>
          <span className="text-xs text-black/40">{terms ? `updated ${fmtDate(terms.updatedAt)}` : ""}</span>
        </button>
        <button
          onClick={() => push({ name: "page", params: { slug: "privacy", title: privacy?.title || "Privacy" } })}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-black/5"
        >
          <Shield className="h-5 w-5 text-black/60" />
          <span className="flex-1 font-medium text-black">Privacy Policy</span>
          <span className="text-xs text-black/40">{privacy ? `updated ${fmtDate(privacy.updatedAt)}` : ""}</span>
        </button>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            qc.clear();
            replace({ name: "discover" });
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}

export function StaticPageView({ slug, title }: { slug: string; title?: string }) {
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: () => api<PageData & { content: string }>(`/api/pages/${slug}`),
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  if (!page) return <p className="text-center text-sm text-black/50">This page is not available yet.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-black">{title || page.title}</h1>
      <div className="mt-4 whitespace-pre-wrap rounded-3xl bg-white/85 p-6 text-sm leading-relaxed text-black/80 ring-1 ring-black/5">
        {page.content}
      </div>
    </div>
  );
}
