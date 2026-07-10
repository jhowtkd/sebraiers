'use client';

import { useState } from 'react';
import { coverImageSrc } from '@/lib/cover-image';

type CoverImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  postId?: string;
};

export function CoverImage({ src, postId, alt = '', ...props }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = coverImageSrc(src, postId);
  if (!resolved || failed) return null;
  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      {...props}
      onError={() => setFailed(true)}
    />
  );
}
