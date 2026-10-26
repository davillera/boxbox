"use server";

import { API_URL, type PredictRequest, type PredictResponse } from "@/lib/api";

export type PredictResult =
  | { ok: true; data: PredictResponse }
  | { ok: false; error: "network" | "predict"; detail?: string };

/** Server-side proxy to POST /predict; the backend validates the payload. */
export async function predictRace(req: PredictRequest): Promise<PredictResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, error: "network" };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      typeof body?.detail === "string" ? body.detail : `HTTP ${res.status}`;
    return { ok: false, error: "predict", detail };
  }
  return { ok: true, data: await res.json() };
}
