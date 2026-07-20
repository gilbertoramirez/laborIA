const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

export async function generateEmbedding(text: string): Promise<number[]> {
  const hfToken = process.env.HUGGINGFACE_API_KEY;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: false },
      }),
      signal: controller.signal,
    });

    if (response.status === 503) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(`503: model loading`);
      (err as Error & { estimated_time?: number }).estimated_time =
        body.estimated_time || 20;
      throw err;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
    }

    const embedding = await response.json();
    return embedding as number[];
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    results.push(embedding);
  }
  return results;
}
