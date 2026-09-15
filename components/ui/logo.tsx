import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

// The source files are black wordmark/icon on transparent background, which
// disappears against dark surfaces (the navbar's translucent overlay, --sheet
// in dark mode). Rather than a CSS filter (which would also dull the brand
// blue dot), *-dark.png is a pre-generated variant with only the near-gray
// pixels inverted to white — see the generation note in this repo's history.
// Both images render together and CSS picks one, so there's no light/dark
// flash while next-themes resolves the class on mount.
export function Logo({ className, priority }: LogoProps) {
  return (
    <span className={cn("relative inline-block h-6 w-[103px]", className)}>
      <Image
        src="/prospectool-logo.png"
        alt="Prospectool"
        fill
        priority={priority}
        sizes="150px"
        className="object-contain object-left dark:hidden"
      />
      <Image
        src="/prospectool-logo-dark.png"
        alt="Prospectool"
        fill
        priority={priority}
        sizes="150px"
        className="hidden object-contain object-left dark:block"
      />
    </span>
  );
}

export function LogoIcon({ className, priority }: LogoProps) {
  return (
    <span className={cn("relative inline-block size-7", className)}>
      <Image
        src="/prsopectool-icon.png"
        alt="Prospectool"
        fill
        priority={priority}
        sizes="40px"
        className="object-contain dark:hidden"
      />
      <Image
        src="/prospectool-icon-dark.png"
        alt="Prospectool"
        fill
        priority={priority}
        sizes="40px"
        className="hidden object-contain dark:block"
      />
    </span>
  );
}
