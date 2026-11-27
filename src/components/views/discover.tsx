"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles, Newspaper } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { EditionCard, EditionSkeleton, SectionTitle, EmptyState, type EditionCardData } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

type FeedEdition = EditionCardData;

export function DiscoverView() {
  const push = useApp((s) => s.push);
  const [q, setQ] = useState("");

  const { data: latest, isLoading } = useQuery({
    queryKey: ["editions", "latest", q],
    queryFn: () => api<FeedEdition[]>(`/api/editions?q=${encodeURIComponent(q)}`),
  });

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">Discover</h1>
        <p className="mt-1 text-sm text-black/55 md:text-base">
          The latest editions from every publisher on the newsstand — tap one to start reading.
        </p>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search editions, magazines or publishers…"
            className="rounded-full bg-white/80 pl-9 border-black/10"
            aria-label="Search editions"
          />
        </div>
      </motion.div>

      <section>
        <SectionTitle sub={q ? "Matching editions, newest first" : "Fresh off the press, newest first"}>
          {q ? (
            `Results for “${q}”`
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-primary" /> Latest editions
            </span>
          )}
        </SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EditionSkeleton key={i} />
            ))}
          </div>
        ) : (latest || []).length === 0 ? (
          <EmptyState
            icon={<Newspaper className="h-6 w-6" />}
            title="No editions found"
            hint={q ? "Try a different search." : "Publishers are setting up their shelves — check back soon."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {(latest || []).map((ed, i) => (
              <EditionCard
                key={ed.id}
                ed={ed}
                index={i}
                onOpen={(id) => push({ name: "edition", params: { id } })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
