"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface CurrentUser {
  email: string;
}

export function useUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUser({ email: data.user.email });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user?.email ? { email: session.user.email } : null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return user;
}
