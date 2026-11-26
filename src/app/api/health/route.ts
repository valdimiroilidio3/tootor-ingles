/** Lightweight liveness endpoint. Learning progress is local and does not require PostgreSQL. */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
