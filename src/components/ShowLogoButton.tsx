import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';
import { showLogo } from '@/lib/showLogo';

interface ShowLogoButtonProps {
  serviceId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const ShowLogoButton = ({ serviceId, variant = 'outline', size = 'default', className }: ShowLogoButtonProps) => {
  const handleShowLogo = () => showLogo(serviceId);

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
