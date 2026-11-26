"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LibraryBig, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { LogoCard, LogoSkeleton, SectionTitle, EmptyState, type MagazineCardData } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; magazines: number };

export function MagazinesView() {
  const push = useApp((s) => s.push);
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");

  const { data: mags, isLoading } = useQuery({
    queryKey: ["magazines", "catalogue", q, catId],
    queryFn: () =>
      api<MagazineCardData[]>(`/api/magazines?q=${encodeURIComponent(q)}${catId ? `&categoryId=${catId}` : ""}`),
  });

  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/api/categories") });

  return (
    <div className="space-y-6">
      <SectionTitle sub="Every magazine on the newsstand — featured titles first">Magazines</SectionTitle>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search magazines…"
          className="rounded-full bg-white/80 pl-9 border-black/10"
          aria-label="Search magazines"
        />
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setCatId("")}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition",
            !catId ? "bg-primary text-primary-foreground ring-primary" : "bg-white/80 text-black/70 ring-black/10 hover:bg-white"
          )}
        >
          All
        </button>
        {(cats || []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id === catId ? "" : c.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition",
              catId === c.id
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-white/80 text-black/70 ring-black/10 hover:bg-white"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <LogoSkeleton key={i} />
          ))}
        </div>
      ) : (mags || []).length === 0 ? (
        <EmptyState
          icon={<LibraryBig className="h-6 w-6" />}
          title="No magazines found"
          hint={q || catId ? "Try a different search or category." : "Publishers are setting up their shelves — check back soon."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {(mags || []).map((m, i) => (
            <LogoCard key={m.id} mag={m} index={i} onOpen={(id) => push({ name: "magazine", params: { id } })} />
          ))}
        </div>
      )}
    </div>
  );
}
