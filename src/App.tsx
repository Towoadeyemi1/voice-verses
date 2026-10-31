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
import ServicePlanner from "./pages/ServicePlanner";
import ServiceBuilder from "./pages/ServiceBuilder";
import Presenter from "./pages/Presenter";
import MediaLibrary from "./pages/MediaLibrary";
import Templates from "./pages/Templates";
import NetworkHome from "./pages/NetworkHome";
import { isNetworkViewer } from "./lib/networkView";
import { startNetworkPublisher } from "./lib/networkPublisher";
import NotFound from "./pages/NotFound";
import { librarySync } from "./lib/library/librarySync";
import { desktop } from "./lib/desktop";
import { isDisplayWindow } from "./lib/appUrl";
import { toast } from "sonner";
import { HelpAssistant } from "./components/HelpAssistant";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Display windows (projection etc.) and network viewers only show slides; the operator window does the rest
    if (isDisplayWindow() || isNetworkViewer) return;
    librarySync.start();
    startNetworkPublisher();
    return desktop?.onUpdateAvailable(({ version, url }) => {
      toast(`Voice Verses ${version} is available`, {
        description: 'Download it and replace the app in Applications when convenient.',
        duration: Infinity,
        action: { label: 'Download', onClick: () => window.open(url, '_blank') },
      });
    });
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
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {!isNetworkViewer && <HelpAssistant />}
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
