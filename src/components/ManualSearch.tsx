import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVerse } from '@/types/bible';

interface ManualSearchProps {
  onVerseSelect: (verse: BibleVerse) => void;
}

export const ManualSearch = ({ onVerseSelect }: ManualSearchProps) => {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<BibleVerse | null>(null);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, []);

  const parseAndPreview = async (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      setError('');
      return;
    }

    const verse = await BibleParser.parseReference(text);
    
    if (verse) {
      setPreview(verse);
      setError('');
    } else {
      setPreview(null);
      setError('Format: "John 3:16" or "john3:16" or "john 3 16"');
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    parseAndPreview(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && preview) {
      onVerseSelect(preview);
      setInput('');
      setPreview(null);
      setError('');
    }
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Quick Search</h3>
            <p className="text-sm text-muted-foreground">
              Type verse reference (Ctrl+K) • Try: john3:16, psalm23:1
            </p>
          </div>
        </div>

        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="e.g., John 3:16 or john3:16 or john 3 16"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {preview && (
              <CheckCircle2 className="w-5 h-5 text-success" />
            )}
            {error && !preview && input && (
              <AlertCircle className="w-5 h-5 text-destructive" />
            )}
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="animate-fade-in p-4 rounded-lg bg-muted/30 border border-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-primary mb-1">
                  {preview.book} {preview.chapter}:{preview.verse}
                </div>
                <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                  "{preview.text}"
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Press <kbd className="px-2 py-0.5 bg-background rounded border border-border">Enter</kbd> to display
            </div>
          </div>
        )}

        {/* Error */}
        {error && !preview && input && (
          <div className="animate-fade-in p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
