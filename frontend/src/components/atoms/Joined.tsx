/** "a · b · c" that only breaks before a separator, so "· sale P1" never splits. */
export function Joined({ parts }: { parts: string[] }) {
  return parts.map((part, i) =>
    i === 0 ? (
      part
    ) : (
      <span key={i}>
        {" "}
        <span className="whitespace-nowrap">· {part}</span>
      </span>
    ),
  );
}
