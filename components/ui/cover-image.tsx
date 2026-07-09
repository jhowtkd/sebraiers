import { coverImageSrc } from '@/lib/cover-image';

type CoverImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
};

export function CoverImage({ src, alt = '', ...props }: CoverImageProps) {
  const resolved = coverImageSrc(src);
  if (!resolved) return null;
  return <img src={resolved} alt={alt} loading="lazy" {...props} />;
}
