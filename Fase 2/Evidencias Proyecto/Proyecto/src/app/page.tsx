"use client";

import AuthForm from "@/components/ui/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface p-margin-mobile">
      <div className="flex flex-col items-center justify-center flex-1">
        <AuthForm type="sign-in" />
      </div>
    </div>
  );
}
