import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiThreads,
  SiX,
} from '@icons-pack/react-simple-icons';
import type { Network } from '@/lib/types';

/**
 * LinkedIn is deliberately excluded from SimpleIcons (and the upstream
 * simple-icons.org set) due to brand guidelines — the trademark owners
 * don't grant redistribution rights for the icon. We inline the official
 * 'in' mark SVG path, which is the de-facto LinkedIn brand icon and is
 * used in countless open-source projects under fair use for identification.
 */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

/**
 * Network brand icon. Defaults to white fill (used on the colored circle
 * avatar in PostCard). Icons are decorative — the adjacent kicker text
 * ("Instagram · @sebraegoias") carries the meaning for screen readers.
 */
export function NetworkIcon({ network, className }: { network: Network; className?: string }) {
  const cls = `h-4 w-4 ${className ?? ''}`;
  switch (network) {
    case 'instagram': return <SiInstagram className={cls} color="#fff" aria-hidden />;
    case 'linkedin': return <LinkedInIcon className={cls} />;
    case 'facebook': return <SiFacebook className={cls} color="#fff" aria-hidden />;
    case 'youtube': return <SiYoutube className={cls} color="#fff" aria-hidden />;
    case 'tiktok': return <SiTiktok className={cls} color="#fff" aria-hidden />;
    case 'threads': return <SiThreads className={cls} color="#fff" aria-hidden />;
    case 'x': return <SiX className={cls} color="#fff" aria-hidden />;
  }
}
