import Header from "@/components/layout/Header";
import { ProfesorBottomNavigation } from "@/components/layout/ProfesorBottomNavigation";
import RoleGuard from "@/components/ui/auth/RoleGuard";

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="profesor">
      <div className="flex flex-col min-h-screen">
        <Header title="Mi Agenda" subtitle="Ritmo Studio • Docente" />
        <main className="flex-1 flex flex-col relative w-full pt-16 pb-bottom-nav-safe bg-background">
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
            {children}
          </div>
        </main>
        <ProfesorBottomNavigation />
      </div>
    </RoleGuard>
  );
}
