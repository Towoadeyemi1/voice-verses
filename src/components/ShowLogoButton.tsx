import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceStorage } from '@/lib/serviceStorage';
import { syncService } from '@/lib/syncService';
import { clearProPresenter } from '@/lib/proPresenter';
import { stopCountdown } from '@/lib/countdown';

interface ShowLogoButtonProps {
  serviceId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const ShowLogoButton = ({ serviceId, variant = 'outline', size = 'default', className }: ShowLogoButtonProps) => {
  const handleShowLogo = async () => {
    let logoUrl = '';
    
    // Try to get service-specific logo first
    if (serviceId) {
      const services = await ServiceStorage.getServices();
      const service = services.find(s => s.id === serviceId);
      logoUrl = service?.serviceLogo || '';
    }
    
    // Fall back to global default logo
    if (!logoUrl) {
      logoUrl = localStorage.getItem('global-service-logo') || '';
    }
    
    // Without a logo the screens still clear: that is what the operator needs in a hurry
    syncService.showLogo(logoUrl);
    stopCountdown();
    clearProPresenter();

    if (logoUrl) {
      toast.success('Service logo displayed on all screens');
    } else {
      toast.info('Screens cleared', { description: 'Add a logo in Settings → Logo to show it here.' });
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleShowLogo}
      className={className}
    >
      <ImageIcon className="w-4 h-4 mr-2" />
      Clear to Logo
    </Button>
  );
};
