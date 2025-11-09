import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Service } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Calendar, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DisplayMonitor } from '@/components/DisplayMonitor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { PageHeader } from '@/components/PageHeader';
import { ModeNav } from '@/components/ModeNav';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Monitor, ChevronDown, ExternalLink } from 'lucide-react';

const ServicePlanner = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDisplayMonitor, setShowDisplayMonitor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadServices();
  }, [selectedDate]);

  const loadServices = () => {
    const allServices = ServiceStorage.getServices();
    setServices(allServices);
  };

  const getServicesForDate = (date: Date) => {
    return services.filter(s => 
      s.date.toDateString() === date.toDateString()
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleCreateService = () => {
    const newService: Service = {
      id: Date.now().toString(),
      name: 'New Service',
      date: selectedDate,
      startTime: '10:00',
      sections: [],
      isTemplate: false,
    };
    ServiceStorage.saveService(newService);
    loadServices();
    toast.success('Service created');
  };

  const handleDeleteService = (id: string) => {
    ServiceStorage.deleteService(id);
    loadServices();
    toast.success('Service deleted');
  };

  const handleDuplicateService = (service: Service) => {
    const duplicate: Service = {
      ...service,
      id: Date.now().toString(),
      name: `${service.name} (Copy)`,
    };
    ServiceStorage.saveService(duplicate);
    loadServices();
    toast.success('Service duplicated');
  };

  const todayServices = getServicesForDate(selectedDate);
  const templates = ServiceStorage.getTemplates();

  const handleOpenProjection = () => {
    window.open('/projection', '_blank', 'width=1920,height=1080');
  };

  const handleOpenLowerThird = () => {
    window.open('/lower-third', '_blank', 'width=1280,height=720');
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Service Planner"
          description="Plan and organize your church services"
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          showDisplayMonitor={showDisplayMonitor}
          onToggleDisplayMonitor={() => setShowDisplayMonitor(!showDisplayMonitor)}
          onOpenProjection={handleOpenProjection}
          onOpenLowerThird={handleOpenLowerThird}
        />

        <div className="space-y-4 sm:space-y-6">
          <ModeNav />

          {/* Settings Panel */}
          {showSettings && (
            <div className="animate-fade-in">
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </div>
          )}

          {/* Display Monitor Section */}
          {showDisplayMonitor && (
            <Card className="p-5 animate-fade-in">
              <Collapsible defaultOpen>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Display Monitor</h3>
                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-primary/10 rounded">Live</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open('/display-manager', '_blank', 'width=1400,height=900')}
                      className="h-7 px-2 hover:bg-primary/10"
                      title="Open in window"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <DisplayMonitor />
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar & Date Selector */}
          <Card className="p-6 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Select Date</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="service-date">Date</Label>
                <Input
                  id="service-date"
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="mt-2"
                />
              </div>

              <Button onClick={handleCreateService} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create Service
              </Button>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/media-library')}
                  >
                    Media Library
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Services for Selected Date */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              Services for {selectedDate.toLocaleDateString()}
            </h2>

            {todayServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No services scheduled for this date
                </p>
                <Button onClick={handleCreateService}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayServices.map((service) => (
                  <Card key={service.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">
                          {service.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {service.startTime} • {service.sections?.length || 0} sections
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/service-builder/${service.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateService(service)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Templates Section */}
        {templates.length > 0 && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Service Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="font-semibold mb-2">{template.templateName}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {template.sections?.length || 0} sections
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const newService: Service = {
                        ...template,
                        id: Date.now().toString(),
                        date: selectedDate,
                        isTemplate: false,
                      };
                      ServiceStorage.saveService(newService);
                      loadServices();
                      toast.success('Service created from template');
                    }}
                  >
                    Use Template
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
         )}
        </div>
      </div>
    </div>
  );
};

export default ServicePlanner;
