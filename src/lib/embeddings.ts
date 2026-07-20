const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

async function hfFetch(
  body: unknown,
  timeoutMs: number
): Promise<Response> {
  const hfToken = process.env.HUGGINGFACE_API_KEY;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(
  inputs: string | string[],
  maxRetries = 2
): Promise<Response> {
  const timeouts = [30000, 15000, 10000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timeoutMs = timeouts[attempt] || 10000;
    const waitForModel = attempt === 0;

    try {
      const response = await hfFetch(
        { inputs, options: { wait_for_model: waitForModel } },
        timeoutMs
      );

      if (response.status === 503 && attempt < maxRetries) {
        const body = await response.text();
        const estimatedTime = JSON.parse(body)?.estimated_time;
        const waitMs = Math.min((estimatedTime || 10) * 1000, 15000);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
      }

      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      if (
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("abort"))
      ) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }

  throw new Error("HuggingFace: max retries exceeded");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetchWithRetry(text);
  const embedding = await response.json();
  return embedding as number[];
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const batchSize = 5;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await fetchWithRetry(batch);
    const embeddings = await response.json();
    results.push(...(embeddings as number[][]));
  }

  return results;
}
