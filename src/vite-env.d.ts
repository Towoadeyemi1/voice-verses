/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Server endpoint that mints OpenAI Realtime client secrets (see azure-functions/realtime-token) */
  readonly VITE_REALTIME_TOKEN_URL?: string;
  /** Server endpoint for the in-app help assistant (see azure-functions/help-assistant) */
  readonly VITE_HELP_ASSISTANT_URL?: string;
  readonly VITE_BASE_PATH?: string;
}
