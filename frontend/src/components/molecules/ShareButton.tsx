"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/atoms/Button";

/** Copies the page address with active race and chaos parameters so a shared link opens on the exact same prediction. */
export function ShareButton({
  raceKey,
  chaosPreset,
  label,
  done,
}: {
  raceKey: string;
  chaosPreset?: string | null;
  label: string;
  done: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = new URL(location.href);
    url.searchParams.set("race", raceKey);
    if (chaosPreset) {
      url.searchParams.set("chaos", chaosPreset);
    } else {
      url.searchParams.delete("chaos");
    }
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
    <Button
      type="button"
      variant="secondary"
      onClick={copy}
      aria-live="polite"
      className="transition-transform duration-100 active:scale-95"
    >
      <Icon aria-hidden className="size-4" strokeWidth={3} />
      {copied ? done : label}
    </Button>
  );
}
