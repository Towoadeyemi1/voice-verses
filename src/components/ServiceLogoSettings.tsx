import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="grid gap-5 sm:grid-cols-[260px_minmax(0,1fr)] items-center" data-logo-settings>
      {/* As the screens show it: the logo on black */}
      <div className="aspect-video rounded-xl bg-black grid place-items-center overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,.28)]">
        {logoUrl ? (
          <img src={logoUrl} alt="The logo" className="max-h-[70%] max-w-[70%] object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-white/40 text-[13px] font-semibold">
            <ImageIcon className="w-7 h-7" />
            No logo yet
          </span>
        )}
      </div>
      <div className="space-y-3 min-w-0">
        <p className="m-0 text-[15px] font-semibold">{serviceId ? 'This service’s logo' : 'The logo for every service'}</p>
        <p className="m-0 text-[13px] text-muted-foreground max-w-[56ch]">
          {serviceId
            ? 'Shown when you press Logo during this service, instead of the church logo.'
            : 'Shown on the screens when you press Logo. A service can have its own instead. A transparent PNG looks best.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => document.getElementById('logo-upload')?.click()}>
            <Upload className="w-4 h-4" />
            {logoUrl ? 'Choose another picture' : 'Choose a picture'}
          </Button>
          {logoUrl && (
            <Button variant="ghost" onClick={handleRemoveLogo}>
              <Trash2 className="w-4 h-4" />
              Remove
            </Button>
          )}
        </div>
        <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>
    </div>
  );
};
