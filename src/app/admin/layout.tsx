import { AdminBottomNavigation } from "@/components/layout/AdminBottomNavigation";
import Header from "@/components/layout/Header";
import RoleGuard from "@/components/ui/auth/RoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="administrador">
      <div className="flex flex-col min-h-screen bg-surface">
        <Header title="Coordinación" subtitle="Admin" />
        <main className="flex-1 overflow-y-auto pb-bottom-nav-safe pt-[72px]">
          {children}
        </main>
        <AdminBottomNavigation />
      </div>
    </RoleGuard>
  );
}
