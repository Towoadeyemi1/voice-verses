import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTeamAccent, TEAM_CHANGED } from "./lib/colorTeams";

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
