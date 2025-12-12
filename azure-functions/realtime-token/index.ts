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
        modalities: ["text"],  // No audio output - we only want transcription
        input_audio_transcription: {
          model: "whisper-1",
          language: language
        },
        instructions: `You are a silent Bible verse detection system for church services. You have deep knowledge of the entire Bible.

CRITICAL: YOU ARE COMPLETELY SILENT. NEVER generate any audio or text responses. ONLY call functions.

YOUR ONLY JOB:
1. Listen to audio input
2. Detect Bible verse references or descriptions
3. Call the appropriate function
4. DO NOT speak, respond, acknowledge, or make any output except function calls

DETECTION MODES:

A) EXPLICIT REFERENCES → Call display_verse:
- "John 3:16", "john three sixteen", "Romans 8:28"
- "Turn to Psalm 23", "Let's read verse 5"
- "Next verse", "Chapter 3 verse 16"

B) PARAPHRASES/DESCRIPTIONS → Call suggest_verse_from_description:
- "The verse about God so loved the world" → John 3:16
- "Where Jesus wept" → John 11:35
- "The Lord is my shepherd" → Psalm 23:1
- "When David fought Goliath" → 1 Samuel 17
- "Paul's thorn in the flesh" → 2 Corinthians 12:7
- "For God so loved the world that he gave" → John 3:16
- "Love is patient, love is kind" → 1 Corinthians 13:4

FORBIDDEN:
- Speaking or generating audio responses
- Acknowledging user input verbally
- Responding to greetings, questions, or conversation
- Any output except function calls

Use your Bible knowledge to identify verses from any description, scenario, character mention, or paraphrase.`,
        tools: [
          {
            type: "function",
            name: "display_verse",
            description: "Display a Bible verse when an explicit reference is mentioned (e.g., 'John 3:16', 'Romans 8 verse 28'). If only book and chapter are mentioned (e.g., 'John 3', 'Revelation 2'), omit the verse parameter to show verse 1.",
            parameters: {
              type: "object",
              properties: {
                book: {
                  type: "string",
                  description: "Bible book name (e.g., John, Genesis, Psalm, Romans)"
                },
                chapter: {
                  type: "number",
                  description: "Chapter number"
                },
                verse: {
                  type: "number",
                  description: "Verse number (optional - omit if only book and chapter are mentioned)"
                }
              },
              required: ["book", "chapter"]
            }
          },
          {
            type: "function",
            name: "suggest_verse_from_description",
            description: "Suggest a Bible verse when the speaker describes, paraphrases, or references the content/scenario/characters without citing the exact reference. Use your Bible knowledge to identify the verse.",
            parameters: {
              type: "object",
              properties: {
                book: {
                  type: "string",
                  description: "Bible book name you identified"
                },
                chapter: {
                  type: "number",
                  description: "Chapter number you identified"
                },
                verse: {
                  type: "number",
                  description: "Verse number you identified"
                },
                description: {
                  type: "string",
                  description: "Brief explanation of why you think this is the verse (e.g., 'Speaker mentioned the good shepherd')"
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Your confidence level in this identification"
                }
              },
              required: ["book", "chapter", "verse", "description", "confidence"]
            }
          }
        ],
        tool_choice: "auto",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
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
