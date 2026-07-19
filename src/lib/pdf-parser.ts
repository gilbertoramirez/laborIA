import { PDFParse } from "pdf-parse";

export interface DocumentChunk {
  content: string;
  metadata: {
    page?: number;
    chunk_index: number;
    source_filename: string;
  };
}

export async function parsePDF(
  buffer: Buffer,
  filename: string
): Promise<DocumentChunk[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const text = result.text;

  return chunkText(text, filename);
}

export function chunkText(
  text: string,
  filename: string,
  maxChunkSize = 1000,
  overlap = 200
): DocumentChunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunk_index: chunkIndex,
          source_filename: filename,
        },
      });
      chunkIndex++;

      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(" ") + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        chunk_index: chunkIndex,
        source_filename: filename,
      },
    });
  }

  return chunks;
}

export function parsePlainText(
  text: string,
  filename: string
): DocumentChunk[] {
  return chunkText(text, filename);
}
