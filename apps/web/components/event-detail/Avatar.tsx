import type { UserSummary } from "@hp1/shared";

import { initialsOf } from "./helpers";

/** Local avatar for the event screen (initials on the user's colour, or their photo). */
export function Avatar({ user, size = 40 }: { user: UserSummary | null; size?: number }) {
  const style = { width: size, height: size, backgroundColor: user?.avatarColor ?? "#5D5348" };
  if (user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user avatars come from arbitrary hosts
      <img src={user.avatarUrl} alt="" style={style} className="shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-canvas"
    >
      {user ? user.avatarInitials || initialsOf(user.nickname) : "?"}
    </span>
  );
}
