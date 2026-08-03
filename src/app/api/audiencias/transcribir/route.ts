import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const GROQ_WHISPER_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se envió archivo de audio" },
        { status: 400 }
      );
    }

    const validTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/m4a",
      "audio/x-m4a",
      "audio/webm",
      "audio/ogg",
    ];
    const isValid =
      validTypes.includes(file.type) ||
      /\.(mp3|wav|m4a|webm|ogg|mp4)$/i.test(file.name);

    if (!isValid) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa MP3, WAV, M4A, WebM u OGG." },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo excede 25MB. Intenta con un archivo más corto." },
        { status: 400 }
      );
    }

    const whisperForm = new FormData();
    whisperForm.append("file", file, file.name);
    whisperForm.append("model", "whisper-large-v3");
    whisperForm.append("language", "es");
    whisperForm.append("response_format", "verbose_json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(GROQ_WHISPER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
        body: whisperForm,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error("Whisper error:", response.status, errText);
        return NextResponse.json(
          { error: `Error en transcripción: ${response.status}` },
          { status: 502 }
        );
      }

      const result = await response.json();

      return NextResponse.json({
        text: result.text || "",
        segments: (result.segments || []).map(
          (s: { start: number; end: number; text: string }) => ({
            start: s.start,
            end: s.end,
            text: s.text.trim(),
          })
        ),
        duration: result.duration || 0,
        filename: file.name,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Tiempo de espera agotado en la transcripción" },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Error procesando el audio" },
      { status: 500 }
    );
  }
}
