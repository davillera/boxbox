import { teamColor } from "@/lib/teams";

export function TeamSwatch({
  teamRef,
}: {
  teamRef: string | null | undefined;
}) {
  return (
    <span
      aria-hidden
      className="inline-block size-3.5 shrink-0 border-2 border-ink outline-1 outline-fg/40"
      style={{ backgroundColor: teamColor(teamRef) }}
    />
  );
}
