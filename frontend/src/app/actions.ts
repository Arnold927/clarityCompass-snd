"use server";

// NOTE: This file runs on the Node.js server (Next.js Server Actions).
// We CANNOT import @/lib/api here because that module references localStorage
// in its axios interceptors, which does not exist in Node.js.
// Instead we call the Django backend directly using fetch + the service token
// read from the request headers forwarded by Next.js middleware.

import { cookies } from "next/headers";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

async function getAuthToken(): Promise<string | null> {
  // The NGO access token is stored in localStorage on the client, but server
  // actions cannot access that. Next.js middleware should forward it as a
  // cookie OR the client can pass it explicitly. We support both approaches:
  // 1. Cookie named "ngo_access_token" (if middleware copies it there)
  // 2. Falls back to the DJANGO_SERVICE_TOKEN env var for server-to-server use
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("ngo_access_token")?.value ||
      process.env.DJANGO_SERVICE_TOKEN ||
      null;
    return token;
  } catch {
    return process.env.DJANGO_SERVICE_TOKEN || null;
  }
}

async function djangoPost(path: string, body: unknown) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    // Don't cache AI responses
    cache: "no-store",
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      errMsg = errBody.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return res.json();
}

// ─── Generate narrative report ────────────────────────────────────────────────
export async function generateReportAction(input: {
  projectData: string;
  targetAudience: string;
  reportContext: string;
  scheduleId?: string;
  reportingPeriod?: string;
}): Promise<{ report: string | null; error: string | null }> {
  try {
    const data = await djangoPost("/generate-report/", input);
    if (data.error) {
      return { report: null, error: data.error };
    }
    return { report: data.report ?? null, error: null };
  } catch (e: any) {
    console.error("generateReportAction:", e);
    return { report: null, error: e.message || "Failed to generate report." };
  }
}

// ─── Evaluate project ─────────────────────────────────────────────────────────
export async function evaluateProjectAction(input: {
  projectData: string;
  evaluationType?: string;
}): Promise<{ evaluation: any | null; error: string | null }> {
  try {
    const data = await djangoPost("/evaluate-project/", input);
    if (data.error) {
      return { evaluation: null, error: data.error };
    }
    return { evaluation: data, error: null };
  } catch (e: any) {
    console.error("evaluateProjectAction:", e);
    return { evaluation: null, error: e.message || "Failed to evaluate project." };
  }
}

// ─── Generate DOCX ───────────────────────────────────────────────────────────
export async function generateDocxAction(
  htmlContent: string
): Promise<{ docx: string | null; error: string | null }> {
  try {
    const data = await djangoPost("/generate-docx/", { htmlContent });
    if (data.error) {
      return { docx: null, error: data.error };
    }
    return { docx: data.docx ?? null, error: null };
  } catch (e: any) {
    console.error("generateDocxAction:", e);
    return { docx: null, error: e.message || "Failed to generate DOCX." };
  }
}