"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles, Newspaper } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { MagCard, CoverSkeleton, SectionTitle, EmptyState, type MagCardData } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; magazines: number };

export function DiscoverView() {
  const push = useApp((s) => s.push);
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");

  const { data: featured } = useQuery({
    queryKey: ["magazines", "featured"],
    queryFn: () => api<MagCardData[]>("/api/magazines?featured=1"),
  });

  const { data: latest, isLoading } = useQuery({
    queryKey: ["magazines", "latest", q, catId],
    queryFn: () =>
      api<MagCardData[]>(`/api/magazines?q=${encodeURIComponent(q)}${catId ? `&categoryId=${catId}` : ""}`),
  });

  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/api/categories") });

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">Discover magazines</h1>
        <p className="mt-1 text-sm text-black/55 md:text-base">
          Independent publications, approved by our team and readable right here.
        </p>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search magazines…"
            className="rounded-full bg-white/80 pl-9 border-black/10"
            aria-label="Search magazines"
          />
        </div>
      </motion.div>

      {featured && featured.length > 0 && !q && !catId && (
        <section>
          <SectionTitle sub="Hand-picked by the platform team">
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-5 w-5 text-primary" /> Featured</span>
          </SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {featured.map((m, i) => (
              <MagCard key={m.id} mag={m} index={i} onOpen={(id) => push({ name: "magazine", params: { id } })} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle sub={catId ? "Filtered by category" : "Everything on the newsstand"}>
          {q ? `Results for “${q}”` : "Latest magazines"}
        </SectionTitle>
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
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
              <CoverSkeleton key={i} />
            ))}
          </div>
        ) : (latest || []).length === 0 ? (
          <EmptyState
            icon={<Newspaper className="h-6 w-6" />}
            title="No magazines found"
            hint={q || catId ? "Try a different search or category." : "Publishers are setting up their shelves — check back soon."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {(latest || []).map((m, i) => (
              <MagCard key={m.id} mag={m} index={i} onOpen={(id) => push({ name: "magazine", params: { id } })} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
