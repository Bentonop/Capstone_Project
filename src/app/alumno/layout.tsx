import Header from "@/components/layout/Header";
import BottomNavigation from "@/components/layout/BottomNavigation";

export default function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header profileLink="/alumno/perfil" />
      <main className="flex flex-col relative w-full pt-16 pb-bottom-nav-safe bg-surface min-h-screen">
        {children}
      </main>
      <BottomNavigation />
    </>
  );
}
