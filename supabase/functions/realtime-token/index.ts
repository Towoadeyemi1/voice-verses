import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Requesting ephemeral token from OpenAI...');

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        modalities: ["text", "audio"],
        instructions: `You are a highly intelligent Bible verse detection system for church services. You have deep knowledge of the entire Bible.

CRITICAL RULES:
1. Detect Bible verses from BOTH explicit references AND descriptions/paraphrases
2. When you identify a verse, immediately call the appropriate function
3. DO NOT engage in conversation or ask questions
4. DO NOT respond verbally to greetings or non-Bible content
5. Stay completely silent unless detecting verses

DETECTION MODES:

A) EXPLICIT REFERENCES (use display_verse):
- "John 3:16", "john three sixteen", "Romans 8:28"
- "Turn to Psalm 23", "Let's read verse 5"
- "Next verse", "Chapter 3 verse 16"

B) PARAPHRASES & DESCRIPTIONS (use suggest_verse_from_description):
- "The verse about God so loved the world" → John 3:16
- "Where Jesus wept" → John 11:35
- "The Lord is my shepherd" → Psalm 23:1
- "When David fought Goliath" → 1 Samuel 17
- "Paul's thorn in the flesh" → 2 Corinthians 12:7
- "The beginning, In the beginning God created" → Genesis 1:1
- "For God so loved the world that he gave" → John 3:16
- "Love is patient, love is kind" → 1 Corinthians 13:4

EXAMPLES:
- "John 3:16" → display_verse(John, 3, 16)
- "The Lord is my shepherd" → suggest_verse_from_description(Psalm 23:1)
- "When Peter denied Jesus three times" → suggest_verse_from_description(Matthew 26:69-75)
- "Good morning" → SILENCE

You are a Bible expert. Use your knowledge to identify verses from any description, scenario, character mention, or paraphrase.`,
        tools: [
          {
            type: "function",
            name: "display_verse",
            description: "Display a Bible verse when an explicit reference is mentioned (e.g., 'John 3:16', 'Romans 8 verse 28'). Use this for clear, direct verse citations.",
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
                  description: "Verse number"
                }
              },
              required: ["book", "chapter", "verse"]
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
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Ephemeral token created successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating ephemeral token:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
