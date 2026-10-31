import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Mic, Type, Palette, HardDrive, Music2, Radio, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { BibleVersionSettings } from './BibleVersionSettings';
import { StorageSettings } from './StorageSettings';
import { ServiceLogoSettings } from './ServiceLogoSettings';
import { BibleParser } from '@/lib/bibleParser';
import { BibleVersionType } from '@/types/bibleVersion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { SpeechEngineSettings } from './SpeechEngineSettings';
import { DesktopDownloads } from './DesktopDownloads';
import { AiAssistantSettings } from './AiAssistantSettings';
import { ProPresenterSettings } from './ProPresenterSettings';
import { MicrophoneSettings } from './MicrophoneSettings';
import { NetworkOutputSettings } from './NetworkOutputSettings';
import { ScreenSettings } from './ScreenSettings';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState<number>(72);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [bibleVersion, setBibleVersion] = useState<BibleVersionType>('kjv');
  const [ccliLicense, setCcliLicense] = useState<string>('');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<string>('en');

  useEffect(() => {
    // Initialize Bible version
    BibleParser.initializeVersion();
    setBibleVersion(BibleParser.getVersion());

    // Load saved settings
    const savedSettings = localStorage.getItem('cornerstone-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setFontSize(settings.fontSize || 72);
      setTheme(settings.theme || 'dark');
      setAutoScroll(settings.autoScroll ?? true);
      setShowReference(settings.showReference ?? true);
      setCcliLicense(settings.ccliLicense || '');
    }
    
    // Load transcription language separately
    const savedLanguage = localStorage.getItem('transcription_language');
    if (savedLanguage) {
      setTranscriptionLanguage(savedLanguage);
    }

  }, []);
  const saveSettings = () => {
    // Keep what other panels saved here (speech engine, input device and channel)
    const settings = {
      ...JSON.parse(localStorage.getItem('cornerstone-settings') || '{}'),
      fontSize,
      theme,
      autoScroll,
      showReference,
      ccliLicense,
    };
    localStorage.setItem('cornerstone-settings', JSON.stringify(settings));
    
    // Save transcription language separately
    localStorage.setItem('transcription_language', transcriptionLanguage);
    
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Broadcast settings update
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
    
    toast.success('Settings saved', {
      description: 'Your preferences have been updated',
    });
  };

  return (
    <Card className="p-6 border-border bg-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gradient">Settings</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 h-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="speech">Speech</TabsTrigger>
          <TabsTrigger value="screens">Screens</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="propresenter">ProPresenter</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="ccli">CCLI</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8 mt-6">
          {/* Audio Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Audio Settings</h4>
            </div>

            <MicrophoneSettings />

            <div className="space-y-2">
              <Label htmlFor="transcription-language">Transcription Language</Label>
              <Select value={transcriptionLanguage} onValueChange={setTranscriptionLanguage}>
                <SelectTrigger id="transcription-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish (Español)</SelectItem>
                  <SelectItem value="fr">French (Français)</SelectItem>
                  <SelectItem value="de">German (Deutsch)</SelectItem>
                  <SelectItem value="it">Italian (Italiano)</SelectItem>
                  <SelectItem value="pt">Portuguese (Português)</SelectItem>
                  <SelectItem value="nl">Dutch (Nederlands)</SelectItem>
                  <SelectItem value="pl">Polish (Polski)</SelectItem>
                  <SelectItem value="ru">Russian (Русский)</SelectItem>
                  <SelectItem value="zh">Chinese (中文)</SelectItem>
                  <SelectItem value="ja">Japanese (日本語)</SelectItem>
                  <SelectItem value="ko">Korean (한국어)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the language for voice transcription. Restart listening for changes to take effect.
              </p>
            </div>
          </div>

          {/* Bible Version Settings */}
          <BibleVersionSettings 
            currentVersion={bibleVersion}
            onVersionChange={setBibleVersion}
          />

          {/* Theme Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Appearance</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Interface Theme</Label>
              <Select value={theme} onValueChange={(value: 'light' | 'dark') => setTheme(value)}>
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the control panel theme (projection display stays dark)
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border">
            <Button onClick={saveSettings} className="w-full gradient-divine">
              Save Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="speech" className="space-y-6 mt-6">
          <SpeechEngineSettings />
          <AiAssistantSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Fonts, sizes, colours, backgrounds and the logo for scripture, songs and announcements on each screen are set
            with templates.
          </p>
          <Button onClick={() => navigate('/templates')}>Open templates</Button>
        </TabsContent>

        <TabsContent value="ccli" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">CCLI License</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your CCLI license number for copyright compliance when displaying song lyrics
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ccli-license">CCLI License Number</Label>
              <Input
                id="ccli-license"
                type="text"
                placeholder="Enter your CCLI license number"
                value={ccliLicense}
                onChange={(e) => setCcliLicense(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This number will be displayed on song lyric slides for copyright compliance
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border">
            <Button onClick={saveSettings} className="w-full gradient-divine">
              Save Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="screens" className="mt-6">
          <ScreenSettings />
        </TabsContent>

        <TabsContent value="network" className="mt-6">
          <NetworkOutputSettings />
        </TabsContent>

        <TabsContent value="propresenter" className="mt-6">
          <ProPresenterSettings />
        </TabsContent>

        <TabsContent value="logo" className="space-y-6 mt-6">
          <ServiceLogoSettings />
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <StorageSettings />
        </TabsContent>

        <TabsContent value="download" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Desktop app</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              The desktop app is the recommended way to run Voice Verses in church: speech recognition runs on the
              computer (no internet or API key needed), keys are kept in the system keychain, and the library can be
              saved to a folder. This website version works too, using browser or OpenAI speech recognition.
            </p>
            <DesktopDownloads />
            <div className="pt-4 border-t text-sm text-muted-foreground">
              Developers: the source code is on{' '}
              <a href="https://github.com/Towoadeyemi1/voice-verses" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                GitHub
              </a>
              .
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
