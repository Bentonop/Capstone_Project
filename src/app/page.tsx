"use client";

import AuthForm from "@/components/ui/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface p-margin-mobile relative overflow-hidden">
      {/* Ambient gold glow for premium aesthetic */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col items-center justify-center flex-1 relative z-10 py-8">
        <AuthForm type="sign-in" />
      </div>
    </div>
  );
}
