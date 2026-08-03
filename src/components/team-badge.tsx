export function TeamBadge({
  name,
  shortName,
  crestUrl,
  size = "md",
}: {
  name: string;
  shortName: string;
  crestUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-24 w-24 text-2xl ring-4 ring-surface-raised",
  }[size];

  if (crestUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={crestUrl} alt={name} className={`${sizeClasses} rounded-full bg-surface-raised object-contain`} />;
  }

  return (
    <span
      className={`font-display flex shrink-0 items-center justify-center rounded-full bg-surface-raised font-bold text-muted ${sizeClasses}`}
    >
      {shortName}
    </span>
  );
}
