import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
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

const rootElement = document.getElementById("root");

try {
  createRoot(rootElement!).render(<App />);
} catch (err) {
  rootElement!.innerHTML = `
    <div style="padding:20px;font-family:monospace;color:red;background:white;min-height:100vh">
      <h2>App failed to load</h2>
      <pre>${err instanceof Error ? err.message + '\n\n' + err.stack : String(err)}</pre>
    </div>
  `;
}
