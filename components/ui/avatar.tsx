import * as React from 'react';
import { cn, initials } from '@/lib/utils';

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-12 w-12 text-body',
  xl: 'h-16 w-16 text-h3',
} as const;

const gradientMap: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]',
  tiktok: 'bg-gradient-to-br from-[#69C9D0] via-[#1A1A1A] to-[#EE1D52]',
  facebook: 'bg-[#1877f2]',
  linkedin: 'bg-[#0a66c2]',
  youtube: 'bg-[#ff0000]',
  threads: 'bg-black',
  x: 'bg-black',
  default: 'bg-gradient-atlantico-cobalto',
};

export const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: keyof typeof sizeMap;
    src?: string | null;
    name: string;
    network?: keyof typeof gradientMap;
  }
>(({ className, size = 'md', src, name, network, ...props }, ref) => {
  const bg = network ? gradientMap[network] : gradientMap.default;
  return (
    <div
      ref={ref}
      className={cn(
        'relative inline-flex overflow-hidden rounded-full items-center justify-center text-white font-bold ring-2 ring-white',
        sizeMap[size],
        !src && bg,
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="select-none">{initials(name)}</span>
      )}
    </div>
  );
});
Avatar.displayName = 'Avatar';