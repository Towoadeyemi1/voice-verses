import { AppShell } from '@/components/shell/AppShell';
import { SettingsPanel } from '@/components/SettingsPanel';

/** Settings as a page (the live screen opens the same panel over itself). */
const Settings = () => (
  <AppShell title="Settings" subtitle="Everything saves as you change it.">
    <SettingsPanel framed={false} />
  </AppShell>
);

export default Settings;
