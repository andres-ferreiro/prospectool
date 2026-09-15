"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { CreditCard, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-media-query";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/hooks/use-user";

interface AvatarMenuProps {
  user: CurrentUser;
  isPaid: boolean;
}

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

function initialsFor(email: string) {
  return email.slice(0, 2).toUpperCase();
}

// Deterministic per-user avatar — no upload flow to build/maintain, and the
// seed being the email means it stays stable across sessions for free.
function avatarUrlFor(seed: string) {
  return `https://api.dicebear.com/10.x/glass/svg?backgroundColorFill=linear&seed=${encodeURIComponent(seed)}`;
}

async function handleSignOut() {
  await fetch("/api/auth/signout", { method: "POST" });
  window.location.href = "/login";
}

// A three-way segmented control reads faster than a vertical radio list —
// all options visible at once, current choice obvious without reading text.
function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn("flex items-center gap-1 rounded-full bg-muted p-1", className)}>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          aria-pressed={theme === value}
          className={cn(
            "flex flex-1 items-center justify-center rounded-full py-1.5 transition-colors duration-150 ease-in-out",
            theme === value
              ? "bg-background text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

// Same subscribe/manage action in both the desktop dropdown and the mobile
// drawer — no more separate "Ajustes" modal to open it from. The dropdown
// wants it reading as a plain menu row (like "Cerrar sesión" below it), the
// drawer wants a full-width tappable button, so the variant only changes
// the wrapper/classes, not the underlying fetch/navigation logic.
function SubscriptionButton({ isPaid, variant }: { isPaid: boolean; variant: "menu" | "button" }) {
  const [loadingPortal, setLoadingPortal] = useState(false);

  if (!isPaid) {
    if (variant === "menu") {
      return (
        <DropdownMenuItem render={<Link href="/precios" />}>
          <CreditCard className="size-4" />
          Suscribirse
        </DropdownMenuItem>
      );
    }
    return (
      <Button className="h-10 w-full" render={<Link href="/precios" />}>
        <CreditCard className="size-4" />
        Suscribirse
      </Button>
    );
  }

  const openPortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "No se pudo abrir el portal de pago", description: data.error, variant: "error" });
        setLoadingPortal(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({ title: "No se pudo abrir el portal de pago", variant: "error" });
      setLoadingPortal(false);
    }
  };

  if (variant === "menu") {
    return (
      <DropdownMenuItem onClick={openPortal} closeOnClick={false}>
        <CreditCard className="size-4" />
        {loadingPortal ? "Abriendo…" : "Administrar suscripción"}
      </DropdownMenuItem>
    );
  }

  return (
    <Button variant="outline" className="h-10 w-full" disabled={loadingPortal} onClick={openPortal}>
      <CreditCard className="size-4" />
      {loadingPortal ? "Abriendo…" : "Administrar suscripción"}
    </Button>
  );
}

function AccountAvatar({ email }: { email: string }) {
  return (
    <Avatar>
      <AvatarImage src={avatarUrlFor(email)} alt="" />
      <AvatarFallback>{initialsFor(email)}</AvatarFallback>
    </Avatar>
  );
}

export function AvatarMenu({ user, isPaid }: AvatarMenuProps) {
  const isDesktop = useIsDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!isDesktop) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Cuenta"
        >
          <AccountAvatar email={user.email} />
        </button>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} showSwipeHandle>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="truncate text-sm font-medium">{user.email}</DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col gap-4 p-4 pt-2 pb-6">
              <ThemeToggle />
              <SubscriptionButton isPaid={isPaid} variant="button" />
              <Button
                variant="ghost"
                className="h-10 w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Cuenta"
      >
        <AccountAvatar email={user.email} />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ThemeToggle className="mx-2 my-1" />

        <DropdownMenuSeparator />

        <SubscriptionButton isPaid={isPaid} variant="menu" />

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
