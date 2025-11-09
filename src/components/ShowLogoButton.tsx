import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceStorage } from '@/lib/serviceStorage';

interface ShowLogoButtonProps {
  serviceId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const ShowLogoButton = ({ serviceId, variant = 'outline', size = 'default', className }: ShowLogoButtonProps) => {
  const handleShowLogo = () => {
    let logoUrl = '';
    
    // Try to get service-specific logo first
    if (serviceId) {
      const services = ServiceStorage.getServices();
      const service = services.find(s => s.id === serviceId);
      logoUrl = service?.serviceLogo || '';
    }
    
    // Fall back to global default logo
    if (!logoUrl) {
      logoUrl = localStorage.getItem('global-service-logo') || '';
    }
    
    if (!logoUrl) {
      toast.error('No service logo configured', {
        description: 'Please upload a logo in Settings first',
      });
      return;
    }

    // Broadcast logo display to all screens
    const logoData = {
      type: 'show-logo',
      logoUrl,
      timestamp: Date.now(),
    };
    
    // Broadcast via BroadcastChannel for same-domain windows
    const channel = new BroadcastChannel('cornerstone-display');
    channel.postMessage(logoData);
    channel.close();
    
    // Store in localStorage for persistence
    localStorage.setItem('cornerstone-current-display', JSON.stringify(logoData));
    
    toast.success('Service logo displayed on all screens');
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleShowLogo}
      className={className}
    >
      <ImageIcon className="w-4 h-4 mr-2" />
      Display Logo
    </Button>
  );
};
