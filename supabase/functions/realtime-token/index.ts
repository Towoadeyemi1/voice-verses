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
        instructions: `You are a silent Bible verse detection system for church services. 
        
CRITICAL RULES:
1. ONLY detect Bible verse references from speech
2. When you hear a verse reference, immediately call the display_verse function
3. DO NOT engage in conversation
4. DO NOT ask questions
5. DO NOT respond verbally unless calling display_verse
6. Detect patterns like: "John 3:16", "john three sixteen", "chapter 3 verse 16", "verse 16"

EXAMPLES:
- User: "John chapter 3 verse 16" → Call display_verse(John, 3, 16)
- User: "Turn to Romans 8:28" → Call display_verse(Romans, 8, 28)
- User: "Let's read verse 5" → Call display_verse(current book, current chapter, 5)
- User: "Good morning everyone" → DO NOTHING, no response

Your only purpose is verse detection. Stay silent otherwise.`,
        tools: [
          {
            type: "function",
            name: "display_verse",
            description: "Display a Bible verse on the projection screen. Call this immediately when you detect ANY Bible reference.",
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
