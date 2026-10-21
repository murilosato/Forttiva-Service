import React from 'react';

interface ForttivaLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  showIconOnly?: boolean;
  className?: string;
}

export const ForttivaLogo: React.FC<ForttivaLogoProps> = ({
  variant = 'light', // 'light' means light text (for dark backgrounds), 'dark' means dark text (for light backgrounds)
  size = 'md',
  showSlogan = true,
  showIconOnly = false,
  className = ''
}) => {
  const isLight = variant === 'light';

  // Sizing definitions
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const titleSizes = {
    sm: 'text-sm tracking-tight',
    md: 'text-lg tracking-tight',
    lg: 'text-2xl tracking-tighter',
    xl: 'text-3xl tracking-tighter'
  };

  const subSizes = {
    sm: 'text-[7px] tracking-[0.25em]',
    md: 'text-[9px] tracking-[0.3em]',
    lg: 'text-[11px] tracking-[0.35em]',
    xl: 'text-[13px] tracking-[0.4em]'
  };

  const sloganSizes = {
    sm: 'text-[7px]',
    md: 'text-[8.5px]',
    lg: 'text-[10px]',
    xl: 'text-xs'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic Forttiva Leaf F Symbol (vector representation based on brand identity) */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]}`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Top angled cap of the F */}
          <path 
            d="M 18 12 L 68 12 C 76 12 82 17 80 25 L 75 42 C 73 48 67 52 61 52 L 40 52 L 18 12 Z" 
            fill={isLight ? "#ffffff" : "#0c2a1c"} 
          />
          {/* Main forward-leaning stem */}
          <path 
            d="M 18 12 L 40 52 L 28 88 C 26 93 21 95 16 95 L 14 95 C 10 95 8 91 10 87 L 26 22 C 28 16 32 12 37 12 Z" 
            fill={isLight ? "#7ea24e" : "#16462d"} 
          />
          {/* Dynamic white/negative swoop separating leaves */}
          <path 
            d="M 14 55 Q 38 42 78 30 Q 52 46 22 66 Z" 
            fill={isLight ? "#071a11" : "#ffffff"} 
          />
          {/* Bottom-right leaf element in fresh olive/lime */}
          <path 
            d="M 28 62 Q 52 50 78 44 C 80 56 75 70 58 73 C 44 75 32 72 28 62 Z" 
            fill="#7ea24e" 
          />
          {/* Soft inner contour tone */}
          <path 
            d="M 32 62 Q 48 54 68 50 C 65 60 58 68 45 70 Z" 
            fill="#4b6f34" 
            opacity="0.9"
          />
        </svg>
      </div>

      {!showIconOnly && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex flex-col">
            <span className={`font-black font-sans uppercase leading-none truncate ${isLight ? 'text-white' : 'text-[#0c2a1c]'} ${titleSizes[size]}`}>
              FORTTIVA
            </span>
            <span className={`font-black font-sans uppercase leading-tight mt-0.5 truncate ${isLight ? 'text-[#9bb779]' : 'text-[#4b6f34]'} ${subSizes[size]}`}>
              S E R V I Ç O S
            </span>
          </div>

          {showSlogan && (
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
              <span className="w-3 h-[1.5px] bg-[#7ea24e] rounded-full inline-block shrink-0"></span>
              <span className={`font-semibold italic lowercase first-letter:uppercase truncate ${isLight ? 'text-emerald-100/70' : 'text-slate-600'} ${sloganSizes[size]}`}>
                Força e eficiência em campo.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForttivaLogo;
