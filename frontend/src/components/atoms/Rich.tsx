/** Dictionary prose with **bold**, *italic* and `code`; nothing else is parsed. */
export function Rich({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith("**"))
      return (
        <strong key={i} className="font-extrabold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("`"))
      return (
        <code
          key={i}
          className="border border-fg/25 bg-raised px-1 py-px font-mono text-[0.85em] [overflow-wrap:anywhere]"
        >
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("*") && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
