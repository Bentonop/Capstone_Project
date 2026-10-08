import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";
import RoleGuard from "@/components/ui/auth/RoleGuard";

export default function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="alumno">
      <Header profileLink="/alumno/perfil" />
      <main className="flex flex-col relative w-full pt-16 pb-bottom-nav-safe bg-surface min-h-screen">
        {children}
      </main>
      <BottomNavigation />
    </RoleGuard>
  );
}
