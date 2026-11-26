"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { MagCard, CoverSkeleton, SectionTitle, EmptyState, type MagCardData } from "@/components/shared";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; magazines: number };

export function BrowseView() {
  const push = useApp((s) => s.push);
  const { data: cats, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Cat[]>("/api/categories"),
  });

  return (
    <div className="space-y-8">
      <SectionTitle sub="Explore every category on the newsstand">Browse</SectionTitle>
      {catsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : !cats || cats.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title="No categories yet" hint="The platform team is setting up." />
      ) : (
        cats.map((c) => (
          <CategoryBlock key={c.id} cat={c} onOpen={(id) => push({ name: "magazine", params: { id } })} />
        ))
      )}
    </div>
  );
}

function CategoryBlock({ cat, onOpen }: { cat: Cat; onOpen: (id: string) => void }) {
  const { data: mags, isLoading } = useQuery({
    queryKey: ["magazines", "cat", cat.id],
    queryFn: () => api<MagCardData[]>(`/api/magazines?categoryId=${cat.id}`),
  });
  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  if (!mags || mags.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-lg font-bold text-black">{cat.name}</h3>
        <span className="text-xs text-black/45">
          {cat.magazines} magazine{cat.magazines === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {mags.map((m, i) => (
          <MagCard key={m.id} mag={m} index={i} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
