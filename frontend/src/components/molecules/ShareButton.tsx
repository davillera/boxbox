"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/atoms/Button";

/** Copies the page address with `?race=` so a shared link opens on the same Grand Prix. */
export function ShareButton({
  raceKey,
  label,
  done,
}: {
  raceKey: string;
  label: string;
  done: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = new URL(location.href);
    url.search = `?race=${raceKey}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or permissions): nothing to confirm.
    }
  };
  const Icon = copied ? Check : LinkIcon;
  return (
    <Button type="button" variant="secondary" onClick={copy} aria-live="polite">
      <Icon aria-hidden className="size-4" strokeWidth={3} />
      {copied ? done : label}
    </Button>
  );
}
