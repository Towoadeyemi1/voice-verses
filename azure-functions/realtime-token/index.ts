import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  // Handle CORS
  context.res = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res.status = 204;
    return;
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      context.log.error('OPENAI_API_KEY is not set');
      context.res = {
        status: 500,
        body: { error: 'OPENAI_API_KEY is not configured' },
        headers: context.res.headers
      };
      return;
    }

    // Get language from request body, default to 'en'
    const { language = 'en' } = req.body || {};
    context.log(`Requesting ephemeral token with language: ${language}`);

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        modalities: ["text"],  // No audio output - transcription only
        input_audio_transcription: {
          model: "whisper-1",
          language: language
        },
        // NO TOOLS - transcription only!
        // All verse detection is now centralized in the frontend VerseDetectionController.
        // This eliminates duplicate triggers and provides consistent behavior
        // across all speech engines (OpenAI, Local/Vosk, WebSpeech).
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600  // Reduced for lower latency
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      context.log.error('OpenAI API error:', response.status, errorText);
      context.res = {
        status: 500,
        body: { error: `OpenAI API error: ${response.status} - ${errorText}` },
        headers: context.res.headers
      };
      return;
    }

    const data = await response.json();
    context.log('Ephemeral token created successfully');

    context.res = {
      status: 200,
      body: data,
      headers: {
        ...context.res.headers,
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    context.log.error("Error creating ephemeral token:", error);
    context.res = {
      status: 500,
      body: { 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      headers: {
        ...context.res.headers,
        'Content-Type': 'application/json'
      }
    };
  }
};

export default httpTrigger;
