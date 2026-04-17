import { cn } from "@/lib/utils";

interface PapelPicadoProps {
  className?: string;
  height?: number;
}

// A single tile of papel-picado cut-paper motif. Tiles horizontally via <pattern>.
function PapelPicadoSvg({
  className,
  height = 40,
  flip = false,
}: PapelPicadoProps & { flip?: boolean }) {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={cn(
        "block w-full text-oro",
        flip ? "rotate-180" : undefined,
        className
      )}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="papel-picado-tile" x="0" y="0" width="120" height="40" patternUnits="userSpaceOnUse">
          {/* String */}
          <line x1="0" y1="2" x2="120" y2="2" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
          {/* Banner */}
          <path
            d="M4 2 L4 24 L14 34 L24 24 L24 2 Z"
            fill="currentColor"
            opacity="0.9"
          />
          {/* Cut-outs on banner 1 */}
          <circle cx="14" cy="12" r="2.5" fill="#F5EFE0" />
          <circle cx="9" cy="20" r="1.5" fill="#F5EFE0" />
          <circle cx="19" cy="20" r="1.5" fill="#F5EFE0" />
          <path d="M14 26 L11 30 L17 30 Z" fill="#F5EFE0" />

          {/* Banner 2 */}
          <path
            d="M34 2 L34 20 L44 32 L54 20 L54 2 Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path d="M38 6 L50 6 L50 10 L38 10 Z" fill="#F5EFE0" opacity="0.8" />
          <circle cx="44" cy="16" r="2" fill="#F5EFE0" />
          <path d="M44 22 L40 26 L48 26 Z" fill="#F5EFE0" />

          {/* Banner 3 */}
          <path
            d="M64 2 L64 26 L74 36 L84 26 L84 2 Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M74 8 L70 14 L72 14 L72 20 L76 20 L76 14 L78 14 Z"
            fill="#F5EFE0"
          />
          <circle cx="69" cy="24" r="1.25" fill="#F5EFE0" />
          <circle cx="79" cy="24" r="1.25" fill="#F5EFE0" />

          {/* Banner 4 */}
          <path
            d="M94 2 L94 22 L104 32 L114 22 L114 2 Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="104" cy="10" r="2.25" fill="#F5EFE0" />
          <path d="M100 16 L108 16 L108 20 L100 20 Z" fill="#F5EFE0" opacity="0.8" />
          <path d="M104 24 L101 28 L107 28 Z" fill="#F5EFE0" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#papel-picado-tile)" />
    </svg>
  );
}

export function PapelPicadoTop(props: PapelPicadoProps) {
  return <PapelPicadoSvg {...props} flip={false} />;
}

export function PapelPicadoBottom(props: PapelPicadoProps) {
  return <PapelPicadoSvg {...props} flip={true} />;
}

export default PapelPicadoTop;
