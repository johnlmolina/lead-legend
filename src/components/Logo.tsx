import { HouseIcon } from "@/components/icons";

export function Logo({
  className = "",
  markClassName = "",
  wordmarkClassName = "",
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-accent-400 to-accent-600 text-ink shadow-sm ${markClassName}`}
      >
        <HouseIcon className="h-4 w-4" />
      </span>
      <span className={`font-display text-[17px] font-medium tracking-tight ${wordmarkClassName}`}>
        Lead Legend
      </span>
    </span>
  );
}
