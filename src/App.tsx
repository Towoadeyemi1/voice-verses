import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Projection from "./pages/Projection";
import LowerThird from "./pages/LowerThird";
import Confidence from "./pages/Confidence";
import DisplayManager from "./pages/DisplayManager";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import Training from "./pages/Training";
import { GuideHost } from "./components/guide/GuideHost";
import { PracticeBand } from "./components/guide/PracticeBand";
import ServicePlanner from "./pages/ServicePlanner";
import ServiceBuilder from "./pages/ServiceBuilder";
import Presenter from "./pages/Presenter";
import MediaLibrary from "./pages/MediaLibrary";
import Templates from "./pages/Templates";
import NetworkHome from "./pages/NetworkHome";
import { isNetworkViewer } from "./lib/networkView";
import { seedSamplesOnce } from "./lib/samples/seed";
import { startNetworkPublisher } from "./lib/networkPublisher";
import NotFound from "./pages/NotFound";
import { librarySync } from "./lib/library/librarySync";
import { desktop, type UpdateState } from "./lib/desktop";
import { isDisplayWindow } from "./lib/appUrl";
import { toast } from "sonner";
import { HelpAssistant } from "./components/HelpAssistant";
import { startModules } from "./core/modules";
import { recentEvents } from "./core/bus";
import { listModules } from "./core/registry";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Display windows (projection etc.) and network viewers only show slides; the operator window does the rest
    if (isDisplayWindow() || isNetworkViewer) return;
    // The modules register and start listening on the event bus (D33)
    startModules();
    // Read-only view of the bus, for the end-to-end checks and for support
    (window as unknown as { __voiceVersesBus?: unknown }).__voiceVersesBus = { recent: recentEvents, modules: listModules };
    librarySync.start();
    startNetworkPublisher();
    // The first time the app opens: sample services and songs, so it shows what it does
    void seedSamplesOnce();
    // Updates (1.19.9): a message once per version and step; Settings → Desktop app → Updates has the rest
    const updates = desktop?.updates;
    if (!updates) return;
    const told = new Set<string>();
    const tell = (s: UpdateState) => {
      const key = `${s.status}:${s.version}`;
      if (!s.version || told.has(key)) return;
      if (s.status === 'ready') {
        told.add(key);
        toast(`Voice Verses ${s.version} is ready`, {
          description: 'Restart to update now, or it installs the next time you quit. Your services and settings stay.',
          duration: Infinity,
          action: { label: 'Restart to update', onClick: () => void updates.install() },
        });
      } else if (s.status === 'available' && s.how === 'installer') {
        told.add(key);
        toast(`Voice Verses ${s.version} is available`, {
          description: 'Download it now; you install it between services. Settings → Desktop app shows how.',
          duration: Infinity,
          action: { label: 'Download', onClick: () => void updates.download() },
        });
      } else if (s.status === 'downloaded') {
        told.add(key);
        toast(`Voice Verses ${s.version} is downloaded`, {
          description: 'Quit Voice Verses, open the installer and drag the app to Applications (Replace).',
          duration: Infinity,
          action: { label: 'Open the installer', onClick: () => void updates.install() },
        });
      }
    };
    updates.state().then(tell).catch(() => {});
    return updates.onState(tell);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Hash routing works on GitHub Pages sub-paths and file:// in the desktop app */}
        <HashRouter>
          <Routes>
            <Route path="/" element={isNetworkViewer ? <NetworkHome /> : <Index />} />
            <Route path="/projection" element={<Projection />} />
            <Route path="/lower-third" element={<LowerThird />} />
            <Route path="/confidence" element={<Confidence />} />
            <Route path="/display-manager" element={<DisplayManager />} />
            <Route path="/service-planner" element={<ServicePlanner />} />
            <Route path="/service-builder/:serviceId" element={<ServiceBuilder />} />
            <Route path="/presenter" element={<Presenter />} />
            <Route path="/media-library" element={<MediaLibrary />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/training" element={<Training />} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {!isNetworkViewer && <HelpAssistant />}
          {!isNetworkViewer && !isDisplayWindow() && <GuideHost />}
          {!isNetworkViewer && !isDisplayWindow() && <PracticeBand />}
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
