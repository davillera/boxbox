import Image from "next/image";
import photos from "@/lib/driver-photos.json";
import { teamColor } from "@/lib/teams";

const photoCredit = (driverRef: string): { file: string } | undefined =>
  (photos as Record<string, { file: string }>)[driverRef];

/** Square face crop with the team colour underneath; without a photo the team colour stands alone. */
export function DriverPhoto({
  driverRef,
  teamRef,
  alt = "",
  className = "size-12",
}: {
  driverRef: string;
  teamRef: string | null | undefined;
  alt?: string;
  /** Sets the size; decorative unless `alt` is given. */
  className?: string;
}) {
  const credit = photoCredit(driverRef);
  const color = teamColor(teamRef);
  return (
    <span
      className={`relative block shrink-0 overflow-hidden border-3 border-b-[6px] border-ink ${className}`}
      style={{ backgroundColor: color, borderBottomColor: color }}
    >
      {credit && (
        <Image
          src={`/drivers/${credit.file}`}
          alt={alt}
          fill
          sizes="96px"
          className="object-cover object-top"
        />
      )}
    </span>
  );
}
