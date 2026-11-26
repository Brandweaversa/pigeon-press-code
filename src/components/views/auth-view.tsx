"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Lock, UserRound, Building2, LogOut, LogIn } from "lucide-react";
import { post } from "@/lib/api";
import { withBusy } from "@/lib/busy";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UploadButton } from "@/components/upload-button";
import { imgSrc } from "@/components/shared";

export function AuthView() {
  const { data: session } = useSession();
  const push = useApp((s) => s.push);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [busy, setBusy] = useState(false);

  // signin
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");

  // register
  const [regRole, setRegRole] = useState<"READER" | "PUBLISHER">("READER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [about, setAbout] = useState("");
  const [logoId, setLogoId] = useState("");

  const afterAuth = () => {
    qc.clear();
    push({ name: "discover" });
  };

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await withBusy("Signing in…", () => signIn("credentials", { email: siEmail, password: siPass, redirect: false }));
      if (r?.error) throw new Error("Wrong email or password.");
      toast.success("Welcome back!");
      afterAuth();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await withBusy("Creating account…", () =>
        post("/api/auth/register", {
          name,
          email,
          password: pass,
          role: regRole,
          ...(regRole === "PUBLISHER" ? { companyName, contactEmail: contactEmail || email, about, logoImageId: logoId } : {}),
        })
      );
      const r = await withBusy("Signing in…", () => signIn("credentials", { email, password: pass, redirect: false }));
      if (r?.error) throw new Error("Account created — please sign in.");
      toast.success(
        regRole === "PUBLISHER"
          ? "Account created. Your publisher profile is awaiting approval."
          : "Account created. Happy reading!"
      );
      afterAuth();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (session?.user) {
    const u = session.user;
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl bg-white/85 p-6 ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground uppercase">
            {(u.name || "U").slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-black">{u.name}</p>
            <p className="truncate text-sm text-black/55">{u.email}</p>
          </div>
        </div>
        <p className="text-sm text-black/60">
          Signed in as <span className="font-semibold">{(u as { role?: string }).role}</span>.
          {(u as { role?: string }).role === "PUBLISHER" ? " Head to the Publish tab to manage your magazines." : (u as { role?: string }).role === "ADMIN" ? " Head to the Admin tab to review submissions." : ""}
        </p>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            await withBusy("Signing out…", () => signOut({ redirect: false }));
            qc.clear();
            useApp.getState().replace({ name: "discover" });
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white/85 p-6 ring-1 ring-black/5">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "register")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="register">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={doSignIn} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                <Input id="si-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} placeholder="you@example.com" className="pl-9 bg-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="si-pass">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                <Input id="si-pass" type="password" required value={siPass} onChange={(e) => setSiPass(e.target.value)} placeholder="••••••••" className="pl-9 bg-white" />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full gap-2">
              <LogIn className="h-4 w-4" /> {busy ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-xs text-black/45">You can browse without an account — sign in to save favourites and get alerts.</p>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
            <span className="text-sm font-medium text-black">Register as publisher</span>
            <Switch checked={regRole === "PUBLISHER"} onCheckedChange={(v) => setRegRole(v ? "PUBLISHER" : "READER")} aria-label="Register as publisher" />
          </div>
          <form onSubmit={doRegister} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">{regRole === "PUBLISHER" ? "Your name" : "Display name"}</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                <Input id="reg-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Thandi Mokoena" className="pl-9 bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-pass">Password</Label>
                <Input id="reg-pass" type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="6+ characters" className="bg-white" />
              </div>
            </div>

            {regRole === "PUBLISHER" && (
              <div className="space-y-4 rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold text-black">Company / publication</p>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <Input value={companyName} required onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Coast Media (Pty) Ltd" className="pl-9 bg-white" aria-label="Company name" />
                </div>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Public contact email (optional)" className="bg-white" aria-label="Contact email" />
                <Textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Short bio — what do you publish? (optional)" className="bg-white min-h-[72px]" aria-label="About" />
                <div className="flex items-center gap-3">
                  <UploadButton
                    kind="company-logo"
                    accept="image/png"
                    label={logoId ? "Replace logo" : "Logo (transparent PNG)"}
                    onUploaded={(r) => setLogoId(r.id)}
                  />
                  {logoId ? <img src={imgSrc(logoId)} alt="logo preview" className="h-10 w-10 object-contain" /> : null}
                </div>
                <p className="text-xs text-black/45">Transparent PNG, max 2 MB. Your registration is reviewed by the platform team.</p>
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
