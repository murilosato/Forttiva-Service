import React from 'react';

interface ForttivaLogoProps {
  variant?: 'light' | 'dark' | 'card';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  showIconOnly?: boolean;
  className?: string;
}

export const ForttivaLogo: React.FC<ForttivaLogoProps> = ({
  variant = 'light',
  size = 'md',
  showIconOnly = false,
  className = ''
}) => {
  // Height mappings for the official logo
  const heightMap = {
    sm: 'h-7 sm:h-8',
    md: 'h-9 sm:h-10',
    lg: 'h-12 sm:h-14',
    xl: 'h-16 sm:h-20'
  };

  const iconContainerMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // If icon-only is requested (e.g. collapsed sidebar or compact avatar)
  if (showIconOnly) {
    return (
      <div className={`overflow-hidden relative rounded-xl bg-white p-1 inline-flex items-center justify-center shadow-sm shrink-0 ${iconContainerMap[size]} ${className}`}>
        <img 
          src="/assets/aistudio/image_b058c63c.png" 
          alt="Forttiva" 
          className="w-full h-full object-contain select-none" 
        />
      </div>
    );
  }

  const cardPaddingMap = {
    sm: 'px-3 py-1.5 rounded-xl',
    md: 'px-4 py-2 rounded-2xl',
    lg: 'px-5 py-3 rounded-2xl',
    xl: 'px-6 py-4 rounded-3xl'
  };

  // When on a dark surface (variant='light' or 'card'), render inside a crisp white card to showcase the official branding
  if (variant === 'light' || variant === 'card') {
    return (
      <div className={`inline-flex items-center justify-center bg-white shadow-md border border-white/40 select-none transition-transform ${cardPaddingMap[size]} ${className}`}>
        <img 
          src="/assets/aistudio/image_d343a7bb.png" 
          alt="Forttiva Serviços - Força e eficiência em campo" 
          className={`${heightMap[size]} w-auto object-contain`} 
        />
      </div>
    );
  }

  // On light surfaces (e.g. reports, white modals)
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img 
        src="/assets/aistudio/image_d343a7bb.png" 
        alt="Forttiva Serviços - Força e eficiência em campo" 
        className={`${heightMap[size]} w-auto object-contain`} 
      />
    </div>
  );
};

export default ForttivaLogo;
