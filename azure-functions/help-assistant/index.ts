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

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      context.res = {
        status: 400,
        body: { error: 'Messages array is required' },
        headers: context.res.headers
      };
      return;
    }

    context.log('Calling OpenAI chat completion...');

    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant for the Cornerstone Church Presenter app. Help users with:

MICROPHONE SETUP:
- Click the microphone icon in the Scripture page
- Allow microphone permissions when prompted
- Speak clearly: "John 3:16" or "Turn to Romans 8:28"
- You can also describe verses: "The verse about God so loved the world"
- The AI will detect and display the verse automatically

DISPLAY SETUP:
- Open Display Manager to configure screens
- Set Main Projection for the congregation
- Set Confidence Monitor for the presenter
- Set Lower Third for subtle scripture display
- Each display opens in a separate window

SCRIPTURE DISPLAY:
- Use Manual Search to find specific verses
- Type book, chapter, and verse
- Click "Display on Screens" to show on all connected displays
- Voice control will also broadcast to all screens automatically

SERVICE BUILDER:
- Create services with slides, scriptures, and media
- Drag and drop to reorder items
- Click items to display them instantly
- Save services for future use

SETTINGS:
- Choose Bible version (KJV, ASV, WEB)
- Configure storage (Local, Azure Blob, File System API)
- Customize display appearance

Keep answers concise, friendly, and focused on practical steps.`
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      context.log.error('OpenAI API error:', response.status, errorText);
      context.res = {
        status: 500,
        body: { error: `OpenAI API error: ${response.status}` },
        headers: context.res.headers
      };
      return;
    }

    const data = await response.json();
    context.log('OpenAI response received successfully');

    context.res = {
      status: 200,
      body: data,
      headers: {
        ...context.res.headers,
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    context.log.error("Error in help assistant:", error);
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
