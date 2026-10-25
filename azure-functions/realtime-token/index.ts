import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { guardRequest, json } from "../shared/guard";

/**
 * Mints a short-lived OpenAI Realtime client secret for a transcription-only
 * session. The browser uses it to open a WebRTC connection directly to OpenAI;
 * the real API key (OPENAI_API_KEY app setting) never leaves the server.
 *
 * Keep the session in sync with src/speech/openai/realtimeSession.ts.
 */

const TRANSCRIPTION_PROMPT =
  "A sermon or Bible reading in a church service. Speakers cite scripture references " +
  "such as John 3:16, 1 Corinthians 13:4-7, Psalm 23, and Romans chapter 8 verse 28.";

function toIsoLanguage(language: unknown): string | undefined {
  const code = typeof language === "string" ? language.split(/[-_]/)[0].toLowerCase() : "";
  return /^[a-z]{2}$/.test(code) ? code : undefined;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const cors = guardRequest(context, req);
  if (!cors) return;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    context.log.error("OPENAI_API_KEY is not set");
    json(context, 500, { error: "Speech service is not configured" }, cors);
    return;
  }

  const session = {
    type: "transcription",
    audio: {
      input: {
        format: { type: "audio/pcm", rate: 24000 },
        noise_reduction: { type: "near_field" },
        transcription: {
          model: "gpt-4o-transcribe",
          language: toIsoLanguage(req.body?.language),
          prompt: TRANSCRIPTION_PROMPT,
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    },
  };

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      // The secret is only needed to open the connection, so keep it short-lived
      body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 120 }, session }),
    });

    if (!response.ok) {
      context.log.error("OpenAI API error:", response.status, await response.text());
      json(context, 502, { error: `OpenAI request failed (${response.status})` }, cors);
      return;
    }

    const data = await response.json();
    json(context, 200, { value: data.value, expires_at: data.expires_at }, cors);
  } catch (error) {
    context.log.error("Error creating client secret:", error);
    json(context, 502, { error: "Could not reach OpenAI" }, cors);
  }
};

export default httpTrigger;
