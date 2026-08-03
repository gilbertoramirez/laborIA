import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Eres un abogado laboralista mexicano experto analizando audiencias de juicios orales laborales.

Se te proporcionará la transcripción de una audiencia laboral. Tu trabajo es analizarla y extraer:

1. **participantes**: Lista de participantes identificados (juez, actor, demandado, testigos, peritos, etc.)
2. **hechos_clave**: Los hechos más importantes mencionados durante la audiencia
3. **admisiones**: Admisiones hechas por cualquiera de las partes (hechos reconocidos)
4. **objeciones**: Objeciones realizadas a pruebas o testimonios
5. **pruebas**: Pruebas ofrecidas, admitidas o desechadas
6. **estrategia**: Lista de insights estratégicos con título, detalle, y relevancia (alta/media/baja)
7. **resumen**: Un resumen ejecutivo de la audiencia (2-3 párrafos)
8. **recomendaciones**: Acciones recomendadas para el siguiente paso procesal

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "participantes": [{"rol": "string", "nombre": "string o null"}],
  "hechos_clave": ["string"],
  "admisiones": [{"quien": "string", "hecho": "string"}],
  "objeciones": [{"descripcion": "string"}],
  "pruebas": [{"tipo": "string", "descripcion": "string", "estado": "ofrecida|admitida|desechada|objetada"}],
  "estrategia": [{"titulo": "string", "detalle": "string", "relevancia": "alta|media|baja"}],
  "resumen": "string",
  "recomendaciones": ["string"]
}`;

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const { transcription } = await request.json();

    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json(
        { error: "Se requiere la transcripción" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `TRANSCRIPCIÓN DE AUDIENCIA LABORAL:\n\n${transcription}`,
            },
          ],
          max_tokens: 3000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        console.error("Analysis error:", response.status, errText);
        return NextResponse.json(
          { error: `Error en análisis: ${response.status}` },
          { status: 502 }
        );
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { error: "No se generó análisis" },
          { status: 500 }
        );
      }

      const analysis = JSON.parse(content);

      return NextResponse.json({ analysis });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Tiempo de espera agotado en el análisis" },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Error procesando el análisis" },
      { status: 500 }
    );
  }
}
