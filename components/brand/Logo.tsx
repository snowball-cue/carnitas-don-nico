import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "hero";

const sizeMap: Record<LogoSize, number> = {
  sm: 24,
  md: 40,
  lg: 80,
  hero: 240,
};

interface LogoProps {
  size?: LogoSize;
  mark?: boolean;
  className?: string;
  priority?: boolean;
}

// NOTE: When `mark` is true we currently reuse the full logo. To use a
// separate pig-only mark, drop a file at `/public/brand/logo-mark.png` and
// update the `src` below to `/brand/logo-mark.png` when `mark` is true.
export function Logo({ size = "md", mark = false, className, priority }: LogoProps) {
  const px = sizeMap[size];
  const src = "/brand/logo.png";
  return (
    <Image
      src={src}
      alt="Carnitas Don Nico"
      width={px}
      height={px}
      priority={priority}
      className={cn("object-contain select-none", className)}
      data-mark={mark ? "true" : undefined}
    />
  );
}

export default Logo;
