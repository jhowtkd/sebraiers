import { Instagram, Linkedin, Facebook, Youtube } from 'lucide-react';
import type { Network } from '@/lib/types';

export function NetworkIcon({ network, className }: { network: Network; className?: string }) {
  const cls = `h-4 w-4 ${className ?? ''}`;
  switch (network) {
    case 'instagram': return <Instagram className={cls} aria-label="Instagram" />;
    case 'linkedin': return <Linkedin className={cls} aria-label="LinkedIn" />;
    case 'facebook': return <Facebook className={cls} aria-label="Facebook" />;
    case 'youtube': return <Youtube className={cls} aria-label="YouTube" />;
    case 'tiktok': return <span className={cls + ' font-bold text-caption'} aria-label="TikTok">T</span>;
    case 'threads': return <span className={cls + ' font-bold text-caption'} aria-label="Threads">@</span>;
    case 'x': return <span className={cls + ' font-bold text-caption'} aria-label="X (Twitter)">𝕏</span>;
  }
}