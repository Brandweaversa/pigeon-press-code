"use client";

import { useSession } from "next-auth/react";
import { useApp } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { DiscoverView } from "@/components/views/discover";
import { MagazinesView } from "@/components/views/magazines";
import { MagazineView } from "@/components/views/magazine";
import { EditionView } from "@/components/views/edition";
import { AuthView } from "@/components/views/auth-view";
import { PublisherView } from "@/components/views/publisher";
import { AdminView } from "@/components/views/admin";
import { SavedView, AlertsView } from "@/components/views/saved-alerts";
import { ProfileView, StaticPageView } from "@/components/views/profile-page";

function CurrentView() {
  const current = useApp((s) => s.current);
  switch (current.name) {
    case "discover":
      return <DiscoverView />;
    case "magazines":
      return <MagazinesView />;
    case "saved":
      return <SavedView />;
    case "alerts":
      return <AlertsView />;
    case "profile":
      return <ProfileView />;
    case "auth":
      return <AuthView />;
    case "publisher":
      return <PublisherView />;
    case "admin":
      return <AdminView />;
    case "magazine":
      return <MagazineView id={current.params?.id || ""} />;
    case "edition":
      return <EditionView id={current.params?.id || ""} />;
    case "page":
      return <StaticPageView slug={current.params?.slug || "terms"} title={current.params?.title} />;
    default:
      return <DiscoverView />;
  }
}

export default function Home() {
  // session presence is only needed to hydrate next-auth before views query it
  useSession();
  return (
    <AppShell>
      <CurrentView />
    </AppShell>
  );
}
