import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Projection from "./pages/Projection";
import LowerThird from "./pages/LowerThird";
import Confidence from "./pages/Confidence";
import DisplayManager from "./pages/DisplayManager";
import Install from "./pages/Install";
import ServicePlanner from "./pages/ServicePlanner";
import ServiceBuilder from "./pages/ServiceBuilder";
import Presenter from "./pages/Presenter";
import MediaLibrary from "./pages/MediaLibrary";
import NotFound from "./pages/NotFound";
import { storageOrchestrator } from "./lib/storageOrchestrator";
import { HelpAssistant } from "./components/HelpAssistant";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize storage orchestrator on app start
    storageOrchestrator.initialize().catch(console.error);
    
    // Cleanup on unmount
    return () => {
      storageOrchestrator.stopAutoSync();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/projection" element={<Projection />} />
            <Route path="/lower-third" element={<LowerThird />} />
            <Route path="/confidence" element={<Confidence />} />
            <Route path="/display-manager" element={<DisplayManager />} />
            <Route path="/service-planner" element={<ServicePlanner />} />
            <Route path="/service-builder/:serviceId" element={<ServiceBuilder />} />
            <Route path="/presenter" element={<Presenter />} />
            <Route path="/media-library" element={<MediaLibrary />} />
            <Route path="/install" element={<Install />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <HelpAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
