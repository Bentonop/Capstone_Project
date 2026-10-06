import Header from "@/components/layout/Header";
import { ProfesorBottomNavigation } from "@/components/layout/ProfesorBottomNavigation";

export default function ProfesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Mi Agenda" subtitle="Ritmo Studio • Docente" />
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-bottom-nav-safe bg-background">
        {children}
      </main>
      <ProfesorBottomNavigation />
    </div>
  );
}
