import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { chat } from '@/ai/providers';
import { isDisplayRoute } from '@/lib/appUrl';
import { AI_SETTINGS_CHANGED_EVENT, AiAssistantSettings, loadAiSettings } from '@/ai/settings';

const HELP_SYSTEM_PROMPT = `You are the built-in help assistant for Voice Verses, church presentation software that listens to a sermon and puts the Bible verses being read on screen. Help church volunteers set it up and use it. Keep answers short, friendly and practical, with numbered steps where useful.

What the app does:
- ProPresenter (optional, desktop app): Settings → ProPresenter also sends each verse to ProPresenter. There is an optional companion screen there for an operator who only sends verses to ProPresenter; "Back to the full Voice Verses app" returns.
- Microphone (Settings → Microphone, or Settings → General): pick the input; for a sound desk connected over USB with many channels, click "Show the channels" and pick the one whose meter moves when the preacher speaks. Recording software such as Logic can keep using the same input.
- Scripture (voice): click Start Listening; say references like "John 3:16" or "Romans chapter 8 verse 28"; "next verse" / "previous verse" move along, and reading the next verse aloud moves the screen on. Quick Search (Ctrl+K) finds a verse by typing. Clear to Logo clears every screen.
- Speech engines (Settings → Speech): Built-in (desktop app; offline, free, private), browser speech recognition (free, Chrome/Edge, website only), or OpenAI (needs an OpenAI API key). Settings → Speech → Test with a recording checks it on a recorded service.
- AI verse assistant (Settings → Speech): optional; recognises described or quoted passages using Claude, OpenAI, Ollama or another local model server. Matches appear as suggestions with a Show button unless automatic display is on.
- Displays: the projection, confidence monitor and lower-third outputs each open in their own window; drag each to its screen and double-click it to fill the screen. The desktop app remembers where each goes, puts the projection on a connected projector by itself, and keeps the computer awake while outputs are open or it is listening. For a livestream, capture the lower-third window in OBS/vMix and key out the green. The Display Manager shows all outputs.
- ProPresenter (Settings → ProPresenter, desktop app, ProPresenter 7.9 or later): in ProPresenter turn on Settings → Network → Enable Network, enter that port in Voice Verses, click Test connection, then create the "Voice Verses" message with a theme. Verses then appear on ProPresenter's Messages layer on the screens its Look sends messages to. Change the look by editing that message and its theme in ProPresenter; keep the {Verse} and {Reference} tokens.
- Services: the Service Planner creates services by date; the Service Builder adds sections, songs (including CSV import of worship songs), scripture, images and announcements, reordered by drag and drop; the Presenter runs a service. Services can be exported to a file and imported on another computer.
- Library folder (Settings → Storage): keeps a copy of services and media in a folder; choose one in iCloud Drive, Dropbox, OneDrive or Google Drive to share between computers.
- Bible versions (Settings → General): KJV, ASV and WEB work offline; ESV and NLT need their own API keys.

If you don't know the answer, say so rather than guessing.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Uses the AI verse assistant's provider; hidden until one is set up. */
export const HelpAssistant = () => {
  const [settings, setSettings] = useState(loadAiSettings);
  const { pathname } = useLocation();

  useEffect(() => {
    const reload = () => setSettings(loadAiSettings());
    window.addEventListener(AI_SETTINGS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(AI_SETTINGS_CHANGED_EVENT, reload);
  }, []);

  // Never on congregation-facing screens
  if (!settings.enabled || !settings.model || isDisplayRoute(pathname)) return null;
  return <HelpAssistantChat settings={settings} />;
};

const HelpAssistantChat = ({ settings }: { settings: AiAssistantSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m here to help you set up and use Voice Verses. Ask me anything about microphone setup, displays, scripture search, or service building!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Skip the greeting: conversations sent to the model must start with the user
      const reply = await chat(settings, {
        system: HELP_SYSTEM_PROMPT,
        messages: [...messages.slice(1), userMessage],
      });
      const assistantMessage: Message = { role: 'assistant', content: reply };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Help assistant error:', error);
      toast.error('Failed to get help response', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 rounded-full shadow-lg h-12 w-12 sm:h-14 sm:w-14 p-0 z-50"
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-8rem)] sm:h-[500px] max-h-[600px] shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base">Help Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
        <div className="space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-2.5 sm:p-3">
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 sm:p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="h-9 sm:h-10 text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
