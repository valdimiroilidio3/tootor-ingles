import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const request = (body: unknown, ip = `test-${Math.random()}`) =>
  new Request("http://localhost/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("tutor API safeguards", () => {
  it("rejects unknown scenarios before contacting a provider", async () => {
    const response = await POST(request({ provider: "external", scenarioId: "unknown", personality: "friendly", difficulty: "beginner", history: [{ role: "user", text: "Hi" }] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Unknown conversation scenario." });
  });

  it("rejects oversized requests", async () => {
    const body = JSON.stringify({ history: [{ role: "user", text: "x".repeat(17_000) }] });
    const req = new Request("http://localhost/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(new TextEncoder().encode(body).byteLength), "x-real-ip": `large-${Math.random()}` },
      body,
    });
    const response = await POST(req);
    expect(response.status).toBe(413);
  });

  it("reports provider errors without exposing response bodies", async () => {
    vi.stubEnv("AI_API_BASE_URL", "https://provider.example/v1");
    vi.stubEnv("AI_API_KEY", "test-secret");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("private upstream detail", { status: 500 })));
    const response = await POST(request({
      provider: "external",
      scenarioId: "introducing-yourself",
      personality: "friendly",
      difficulty: "beginner",
      history: [{ role: "user", text: "Hello, my name is Sam." }],
    }));
    expect(response.status).toBe(502);
    const result = await response.json();
    expect(JSON.stringify(result)).not.toContain("private upstream detail");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
});
