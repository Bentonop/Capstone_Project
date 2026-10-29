"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";

function hasAuthErrorInUrl() {
  if (typeof window === "undefined") return false;

  const queryParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));

  return (
    queryParams.has("error") ||
    queryParams.has("error_code") ||
    hashParams.has("error") ||
    hashParams.has("error_code")
  );
}

export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setHasSession(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setIsCheckingSession(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-4">
        <section className="w-full max-w-lg rounded-3xl bg-background p-6 shadow-sm sm:p-8">
          <p className="text-center text-sm text-muted-foreground">Validando el enlace…</p>
        </section>
      </main>
    );
  }

  if (hasAuthErrorInUrl() || !hasSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-4">
        <section className="w-full max-w-lg rounded-3xl bg-background p-6 shadow-sm sm:p-8">
          <p role="alert" className="text-center text-sm text-destructive">
            Este enlace ya se usó, venció o no es válido. Solicita un nuevo correo de recuperación.
          </p>
          <Button className="mt-5 w-full" type="button" onClick={() => router.replace("/")}>
            Volver al inicio
          </Button>
        </section>
      </main>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres. Por favor, ingresa una contraseña más larga.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden. Asegurate de escribir la misma en ambos campos.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("same password") || msg.includes("different password") || msg.includes("password should be different")) {
        setErrorMessage("La nueva contraseña no puede ser igual a la anterior. Por favor, elige una contraseña diferente.");
      } else {
        setErrorMessage("No se pudo actualizar la contraseña. Solicita un nuevo correo de recuperación e inténtalo otra vez.");
      }
      return;
    }

    toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="w-full max-w-lg rounded-3xl bg-background p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-3xl font-semibold">Nueva contraseña</h1>
        <p className="mb-4 mt-3 text-center text-sm text-muted-foreground">
          Ingresa y confirma la contraseña nueva para tu cuenta.
        </p>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-xl text-sm font-medium flex items-start gap-2 mb-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <label className="grid gap-2 text-sm font-medium" htmlFor="new-password">
              Nueva contraseña
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSaving}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium" htmlFor="confirm-password">
              Confirmar contraseña
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSaving}
              />
            </label>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando…" : "Guardar contraseña"}
            </Button>
        </form>
      </section>
    </main>
  );
}
