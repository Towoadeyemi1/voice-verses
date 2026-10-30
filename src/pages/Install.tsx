import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Monitor, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DesktopDownloads } from '@/components/DesktopDownloads';
import { useEffect, useState } from 'react';

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Install Voice Verses</h1>
          <p className="text-xl text-muted-foreground">
            Get instant access to voice-activated scripture projection
          </p>
        </div>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Desktop app (recommended for churches)
            </CardTitle>
            <CardDescription>
              Works offline with built-in speech recognition. One installer, nothing else to set up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DesktopDownloads />
          </CardContent>
        </Card>

        {isInstallable && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Install Now
              </CardTitle>
              <CardDescription>
                Click below to install this app on your device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstallClick} size="lg" className="w-full">
                Install Voice Verses
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Install the website as an app
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Chrome / Edge:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Click the install icon in the address bar</li>
                  <li>Or click the three dots menu → "Install Voice Verses"</li>
                  <li>The app will open in its own window</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Safari (Mac):</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Click File → Add to Dock</li>
                  <li>The app will be added to your Dock</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Installation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">iPhone / iPad:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Open in Safari browser</li>
                  <li>Tap the Share button</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Android:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Open in Chrome browser</li>
                  <li>Tap the three dots menu</li>
                  <li>Tap "Install app" or "Add to Home screen"</li>
                  <li>Tap "Install" to confirm</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Benefits of Installing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>✓ Works offline after installation</li>
              <li>✓ Launches in its own window like a native app</li>
              <li>✓ Faster loading and performance</li>
              <li>✓ Easy access from your desktop or home screen</li>
              <li>✓ No need to remember the URL</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Return to App
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
