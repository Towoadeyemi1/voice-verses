import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen } from 'lucide-react';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVerse } from '@/types/bible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ManualSearchProps {
  onVerseSelect: (verse: BibleVerse) => void;
}

export const ManualSearch = ({ onVerseSelect }: ManualSearchProps) => {
  const [selectedBook, setSelectedBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [verse, setVerse] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [books] = useState(BibleParser.getAllBooks());

  const handleSearch = () => {
    if (!selectedBook || !chapter || !verse) {
      return;
    }

    const verseData = BibleParser.getVerse(
      selectedBook,
      parseInt(chapter),
      parseInt(verse)
    );

    if (verseData) {
      onVerseSelect(verseData);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setBookOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, []);

  return (
    <Card className="p-6 border-border bg-card">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Manual Search</h3>
            <p className="text-sm text-muted-foreground">Quick verse lookup (Ctrl+K)</p>
          </div>
        </div>

        <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-3">
          {/* Book Selector */}
          <Popover open={bookOpen} onOpenChange={setBookOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={bookOpen}
                className="justify-between"
              >
                {selectedBook || "Select book..."}
                <BookOpen className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search books..." />
                <CommandList>
                  <CommandEmpty>No book found.</CommandEmpty>
                  <CommandGroup>
                    {books.map((book) => (
                      <CommandItem
                        key={book}
                        value={book}
                        onSelect={(value) => {
                          setSelectedBook(value);
                          setBookOpen(false);
                        }}
                      >
                        {book}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Chapter Input */}
          <Input
            type="number"
            placeholder="Ch"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            onKeyPress={handleKeyPress}
            min="1"
          />

          {/* Verse Input */}
          <Input
            type="number"
            placeholder="Vs"
            value={verse}
            onChange={(e) => setVerse(e.target.value)}
            onKeyPress={handleKeyPress}
            min="1"
          />

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={!selectedBook || !chapter || !verse}
            className="gradient-divine"
          >
            Go
          </Button>
        </div>
      </div>
    </Card>
  );
};
