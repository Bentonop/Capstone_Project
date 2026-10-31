"use client";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({ size = "md", showText = true, className = "" }: BrandLogoProps) {
  const sizes = {
    sm: { icon: "w-8 h-8", text: "text-sm", sub: "text-[9px]" },
    md: { icon: "w-12 h-12", text: "text-lg", sub: "text-[10px]" },
    lg: { icon: "w-16 h-16", text: "text-2xl", sub: "text-xs" },
    xl: { icon: "w-20 h-20", text: "text-3xl", sub: "text-sm" },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`flex flex-col items-center justify-center gap-2 select-none ${className}`}>
      {/* Insignia Isotipo */}
      <div className={`relative ${currentSize.icon} flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E201D] via-[#2A2C28] to-[#141513] shadow-lg border border-[#D4A72C]/30 p-2 group transition-transform hover:scale-105`}>
        {/* Glowing aura */}
        <div className="absolute inset-0 rounded-2xl bg-[#D4A72C]/10 blur-md pointer-events-none"></div>

        {/* SVG Isotipo de Danza & Movimiento */}
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full relative z-10"
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5DF88" />
              <stop offset="50%" stopColor="#D4A72C" />
              <stop offset="100%" stopColor="#A67B16" />
            </linearGradient>
            <linearGradient id="glowRing" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4A72C" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F5DF88" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Anillo exterior fluido (Ritmo) */}
          <circle 
            cx="50" 
            cy="50" 
            r="42" 
            stroke="url(#glowRing)" 
            strokeWidth="2" 
            strokeDasharray="160 30" 
            strokeLinecap="round" 
          />

          {/* Silueta de movimiento estilizado / Cintillo de Danza */}
          <path 
            d="M 50 18 C 58 32, 74 38, 70 56 C 66 72, 48 80, 36 72 C 26 65, 28 50, 42 45 C 56 40, 62 30, 50 18 Z" 
            fill="url(#goldGradient)" 
            opacity="0.25"
          />

          {/* Letras entrelazadas CA (Cuerpo & Alma) */}
          <text 
            x="50" 
            y="58" 
            fontFamily="'Plus Jakarta Sans', sans-serif" 
            fontSize="32" 
            fontWeight="800" 
            fill="url(#goldGradient)" 
            textAnchor="middle" 
            dominantBaseline="middle"
            letterSpacing="-1"
          >
            CA
          </text>

          {/* Destello sutil */}
          <circle cx="68" cy="30" r="2.5" fill="#FFF4D0" />
          <path d="M68 25 L68 35 M63 30 L73 30" stroke="#FFF4D0" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {/* Nombre y Leyenda */}
      {showText && (
        <div className="flex flex-col items-center text-center mt-1">
          <span className={`font-headline-md ${currentSize.text} font-extrabold tracking-tight text-on-surface`}>
            Cuerpo & Alma
          </span>
          <span className={`font-label-caps ${currentSize.sub} font-bold text-primary tracking-[0.25em] uppercase`}>
            Ritmo Studio • Danza & Pole
          </span>
        </div>
      )}
    </div>
  );
}
