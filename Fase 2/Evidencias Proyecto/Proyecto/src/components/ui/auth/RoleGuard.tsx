"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRole: "administrador" | "profesor" | "alumno";
}

export default function RoleGuard({ children, allowedRole }: RoleGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/");
        return;
      }

      // 2. Check their role in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        router.replace("/");
        return;
      }

      // 3. Verify if their role matches the allowed role for this section
      if (profile.role !== allowedRole) {
        // Redirect them to their proper dashboard
        if (profile.role === "administrador") {
          router.replace("/admin/dashboard");
        } else if (profile.role === "profesor") {
          router.replace("/profesor/dashboard");
        } else if (profile.role === "alumno") {
          router.replace("/alumno/dashboard");
        } else {
          router.replace("/");
        }
      } else {
        setIsAuthorized(true);
      }
    };

    checkAuth();
  }, [router, allowedRole]);

  if (!isAuthorized) {
    // Show a blank/loading screen while checking auth to prevent flashing unauthorized content
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
