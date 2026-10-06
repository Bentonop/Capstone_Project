import Link from "next/link";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  profileLink?: string;
}

export default function Header({ title = "Cuerpo y Alma", subtitle = "Inicio", profileLink = "#" }: HeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)] pt-safe">
      <div className="h-16 px-margin-mobile flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          {/* Logo placeholder */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-on-primary">
            CA
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none">
              {title}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              {subtitle}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-space-xs">
          <button aria-label="Notificaciones" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
          </button>
          <Link href={profileLink} className="relative flex items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-transform">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest shadow-[0_2px_6px_rgba(17,22,37,0.08)] flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
