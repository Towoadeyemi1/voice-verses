import { toast } from 'sonner';
import { ServiceStorage } from '@/lib/serviceStorage';
import { syncService } from '@/lib/syncService';
import { clearProPresenter } from '@/lib/proPresenter';
import { stopCountdown } from '@/lib/countdown';

/** Shows the service's logo (or the church logo) on every screen, stopping any countdown. */
export async function showLogo(serviceId?: string): Promise<void> {
  let logoUrl = '';
  if (serviceId) {
    const services = await ServiceStorage.getServices();
    logoUrl = services.find((s) => s.id === serviceId)?.serviceLogo || '';
  }
  if (!logoUrl) logoUrl = localStorage.getItem('global-service-logo') || '';
  // Without a logo the screens still clear: that is what the operator needs in a hurry
  syncService.showLogo(logoUrl);
  stopCountdown();
  clearProPresenter();
  if (logoUrl) toast.success('Service logo displayed on all screens');
  else toast.info('Screens cleared', { description: 'Add a logo in Settings → Logo to show it here.' });
}
