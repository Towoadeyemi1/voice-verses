import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceStorage } from '@/lib/serviceStorage';

interface ServiceLogoSettingsProps {
  serviceId?: string;
}

export const ServiceLogoSettings = ({ serviceId }: ServiceLogoSettingsProps) => {
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    const loadLogo = async () => {
      if (serviceId) {
        const services = await ServiceStorage.getServices();
        const service = services.find(s => s.id === serviceId);
        setLogoUrl(service?.serviceLogo || '');
      } else {
        setLogoUrl(localStorage.getItem('global-service-logo') || '');
      }
    };
    loadLogo();
  }, [serviceId]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setLogoUrl(dataUrl);
      
      if (serviceId) {
        // Update specific service
        const services = await ServiceStorage.getServices();
        const service = services.find(s => s.id === serviceId);
        if (service) {
          service.serviceLogo = dataUrl;
          await ServiceStorage.saveService(service);
          toast.success('Service logo updated');
        }
      } else {
        // Update global default
        localStorage.setItem('global-service-logo', dataUrl);
        toast.success('Default service logo updated');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveLogo = async () => {
    setLogoUrl('');
    
    if (serviceId) {
      const services = await ServiceStorage.getServices();
      const service = services.find(s => s.id === serviceId);
      if (service) {
        service.serviceLogo = undefined;
        await ServiceStorage.saveService(service);
        toast.success('Service logo removed');
      }
    } else {
      localStorage.removeItem('global-service-logo');
      toast.success('Default service logo removed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">
          {serviceId ? 'Service Logo' : 'Default Service Logo'}
        </h4>
      </div>

      <div className="space-y-4">
        {logoUrl && (
          <div className="border border-border rounded-lg p-4 bg-muted/50">
            <img 
              src={logoUrl} 
              alt="Service Logo" 
              className="max-h-32 mx-auto object-contain"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => document.getElementById('logo-upload')?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {logoUrl ? 'Change Logo' : 'Upload Logo'}
          </Button>
          
          {logoUrl && (
            <Button
              variant="outline"
              onClick={handleRemoveLogo}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        <p className="text-xs text-muted-foreground">
          {serviceId 
            ? 'Upload a logo for this specific service. This will be displayed when you click "Show Logo".'
            : 'Upload a default logo to use for all services unless a specific service logo is set.'
          }
        </p>
      </div>
    </div>
  );
};
