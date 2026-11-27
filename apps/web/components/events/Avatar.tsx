import type { UserSummary } from "@hp1/shared";

const SIZES = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" } as const;

/** Round initials badge (or photo) for a public user summary. */
export function Avatar({
  user,
  size = "md",
  className = "",
}: {
  user: Pick<UserSummary, "nickname" | "avatarInitials" | "avatarColor" | "avatarUrl">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface font-semibold text-canvas ${SIZES[size]} ${className}`;
  if (user.avatarUrl) {
    return (
      <span className={base} title={user.nickname}>
        {/* eslint-disable-next-line @next/next/no-img-element -- avatars may be external https URLs */}
        <img src={user.avatarUrl} alt={user.nickname} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className={base} style={{ backgroundColor: user.avatarColor || "#1C4532" }} title={user.nickname} aria-label={user.nickname}>
      {user.avatarInitials || user.nickname.slice(0, 2).toUpperCase()}
    </span>
  );
}
