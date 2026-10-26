/** Monospace block on the tarmac: code samples and pseudo-code in the model guide. */
export function CodeBlock({
  code,
  caption,
}: {
  code: string;
  caption?: string;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <pre className="overflow-x-auto border-3 border-ink bg-ink p-4 font-mono text-sm leading-relaxed text-chalk shadow-hard-sm">
        <code>{code}</code>
      </pre>
      {caption && (
        <figcaption className="text-xs text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}
