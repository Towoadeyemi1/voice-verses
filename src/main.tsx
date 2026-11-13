import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/figtree";
import "@fontsource-variable/newsreader";
import "./index.css";
import { applyTeamAccent, TEAM_CHANGED } from "./lib/colorTeams";
import { noteFirstRun } from "./lib/boothSetup";
import { isDisplayWindow } from "./lib/appUrl";
import { isNetworkViewer } from "./lib/networkView";

// Before anything is saved: is this a new booth? (Set up your booth opens by itself then)
if (!isDisplayWindow() && !isNetworkViewer) noteFirstRun();

// The app's accent follows the colour team
applyTeamAccent();
window.addEventListener(TEAM_CHANGED, () => applyTeamAccent());
window.addEventListener("storage", () => applyTeamAccent());
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById("root")!).render(<App />);
