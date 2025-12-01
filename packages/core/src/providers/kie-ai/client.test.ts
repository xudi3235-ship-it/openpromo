import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KieAIClient, KieAIError } from "./client";

const TASK_ID = "75124c906494a4bfc0dc111f4997ecd4";
const BASE_URL = "https://mocked.kie.ai";

describe("KieAIClient veo31 record-info fallback handling", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as Partial<typeof globalThis>).fetch;
    }
    vi.restoreAllMocks();
  });

  it("surfaces raw payload details when veo31 record-info responds with a 400", async () => {
    const rawPayload = {
      code: 400,
      msg: "Task not found",
      data: {
        successFlag: 3,
        errorMessage: "taskId not exists",
      },
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(rawPayload), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new KieAIClient({ apiKey: "test-key", baseUrl: BASE_URL });

    let caughtError: unknown;
    try {
      await client.veo31GetVideoDetails(TASK_ID);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(KieAIError);

    const kieError = caughtError as KieAIError & {
      details?: {
        rawData?: unknown;
        data?: unknown;
        zodIssues?: unknown;
      };
    };

    expect(kieError.code).toBe(400);
    expect(kieError.message).toBe("Task not found");
    expect(kieError.details).toMatchObject({
      rawData: rawPayload,
      data: rawPayload.data,
    });
    expect(kieError.details?.zodIssues).toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/veo/record-info?taskId=${TASK_ID}`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });
});
