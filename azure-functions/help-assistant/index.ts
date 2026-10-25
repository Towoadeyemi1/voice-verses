import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { guardRequest, json } from "../shared/guard";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const cors = guardRequest(context, req);
  if (!cors) return;

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      context.log.error('OPENAI_API_KEY is not set');
      json(context, 500, { error: 'Help assistant is not configured' }, cors);
      return;
    }

    // Only plain user/assistant turns from the client; the system prompt is ours
    const rawMessages = req.body?.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      json(context, 400, { error: 'Messages array is required' }, cors);
      return;
    }
    const messages = rawMessages
      .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_MESSAGES)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

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
      context.log.error('OpenAI API error:', response.status, await response.text());
      json(context, 502, { error: `OpenAI request failed (${response.status})` }, cors);
      return;
    }

    const data = await response.json();
    json(context, 200, data, cors);
  } catch (error) {
    context.log.error("Error in help assistant:", error);
    json(context, 502, { error: 'Could not reach OpenAI' }, cors);
  }
};

export default httpTrigger;
