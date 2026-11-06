import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Service } from '@/types/service';
import { ServiceStorage } from '@/lib/serviceStorage';
import { Plus, Edit, Trash2, Copy, Download, Upload, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AppShell, Section } from '@/components/shell/AppShell';
import { timelineParts } from '@/components/live/ServiceTimeline';
import { duplicateService, nextSunday } from '@/lib/duplicateService';
import { serviceFromStarter, STARTER_SERVICES, StarterService } from '@/lib/starters';
import { serviceType } from '@/lib/serviceTypes';
import { serviceFromTemplate, templateName } from '@/lib/serviceTemplates';
import { TemplateDialog } from '@/components/service-templates/TemplateDialog';
import { colorFor } from '@/components/live/ServiceTimeline';
import { useLibraryUpdated } from '@/hooks/use-library-updated';
import { SERVICE_EXPORT_EXTENSION, exportService, importService } from '@/lib/library/files';
import { addSamples, removeSamples, SAMPLES_CHANGED } from '@/lib/samples/seed';

const shortDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** The type of service, as a small coloured label */
const TypePill = ({ type }: { type: string }) => (
  <span className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground mb-0.5">
    <i className="w-2 h-2 rounded-full" style={{ background: colorFor(type) === '#64748b' ? 'hsl(var(--primary))' : colorFor(type) }} />
    {type}
  </span>
);

/** The order of service as a thin bar of its parts, as long as each part's time */
const OrderBar = ({ service }: { service: Service }) => {
  const parts = timelineParts(service);
  if (!parts.length) return <span className="text-[13px] text-muted-foreground mt-2">No parts yet</span>;
  return (
    <span className="flex gap-[2px] mt-2.5 h-1.5" aria-hidden="true">
      {parts.map((p) => (
        <span key={p.item.id} className="rounded-full" style={{ flex: p.minutes, background: p.color }} />
      ))}
    </span>
  );
};

/** "8 parts · about 1 h 45" */
const summaryOf = (service: Service) => {
  const parts = timelineParts(service);
  const minutes = parts.reduce((n, p) => n + p.minutes, 0);
  const length = minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ''}` : `${minutes} min`;
  return parts.length ? `${parts.length} ${parts.length === 1 ? 'part' : 'parts'} · about ${length}` : 'Empty: add parts in the editor';
};

const ServicePlanner = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    loadServices();
  }, [selectedDate]);

  const loadServices = async () => {
    const allServices = await ServiceStorage.getServices();
    setServices(allServices);
  };

  useLibraryUpdated(() => loadServices());
  useEffect(() => {
    const reload = () => void loadServices();
    window.addEventListener(SAMPLES_CHANGED, reload);
    return () => window.removeEventListener(SAMPLES_CHANGED, reload);
  }, []);
  const hasSamples = services.some((s) => s.sample);
  const toggleSamples = async () => {
    if (hasSamples) {
      await removeSamples();
      toast.success('The sample services and songs are removed', { description: 'Add them back here any time.' });
    } else {
      await addSamples();
      toast.success('Sample services and songs added');
    }
  };

  const getServicesForDate = (date: Date) => {
    return services.filter(s =>
      !s.isTemplate && new Date(s.date).toDateString() === date.toDateString()
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleCreateService = async () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // Format: "HH:MM"
    
    const newService: Service = {
      id: Date.now().toString(),
      name: 'New Service',
      date: selectedDate,
      startTime: currentTime,
      sections: [],
      isTemplate: false,
    };
    await ServiceStorage.saveService(newService);
    await loadServices();
    toast.success('Service created');
    navigate(`/service-builder/${newService.id}`);
  };

  /** A new service from a ready-made order of service, on the chosen date, opened to fill in. */
  const handleStarter = async (starter: StarterService) => {
    const service = serviceFromStarter(starter, selectedDate);
    await ServiceStorage.saveService(service);
    await loadServices();
    toast.success(`${starter.name} created`, { description: 'Add the songs, verses and slides to each part.' });
    navigate(`/service-builder/${service.id}`);
  };

  const handleDeleteService = async (id: string) => {
    await ServiceStorage.deleteService(id);
    await loadServices();
    toast.success('Service deleted');
  };

  /** A copy for the Sunday after the original (or after today, for an old service), opened to edit. */
  const handleDuplicateService = async (service: Service) => {
    const after = new Date(Math.max(new Date(service.date).getTime(), Date.now()));
    const date = nextSunday(after);
    const duplicate = duplicateService(service, date);
    await ServiceStorage.saveService(duplicate);
    toast.success(`Copied for ${date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`, {
      description: 'Change the date or anything else in the editor.',
    });
    navigate(`/service-builder/${duplicate.id}`);
  };

  const handleExportService = (service: Service) => {
    const blob = new Blob([exportService(service)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${service.name.replace(/[^\w\s-]/g, '').trim() || 'service'}${SERVICE_EXPORT_EXTENSION}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleImportService = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const imported = importService(await file.text());
      const exists = services.some(s => s.id === imported.id);
      // Importing next to the original keeps both instead of overwriting
      const service: Service = exists
        ? { ...imported, id: Date.now().toString(), name: `${imported.name} (imported)` }
        : imported;
      await ServiceStorage.saveService(service);
      await loadServices();
      setSelectedDate(service.date);
      toast.success(`Imported "${service.name}"`);
    } catch (error) {
      toast.error('Could not import service', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // ---- Service templates (1.18.1) ----------------------------------------------------

  const [templateDialog, setTemplateDialog] = useState<{ open: boolean; type?: string }>({ open: false });
  const openNewTemplate = (type?: string) => setTemplateDialog({ open: true, type });
  const createTemplate = async (template: Service) => {
    await ServiceStorage.saveService(template);
    setTemplateDialog({ open: false });
    await loadServices();
    toast.success(`Template “${templateName(template)}” made`, { description: `For ${template.type}. Change its parts in the editor.` });
    navigate(`/service-builder/${template.id}`);
  };
  const planFromTemplate = async (template: Service) => {
    const service = serviceFromTemplate(template, selectedDate);
    await ServiceStorage.saveService(service);
    await loadServices();
    toast.success(`${service.name} planned for ${shortDay(selectedDate)}`, { description: 'Add the songs, verses and slides for this day.' });
    navigate(`/service-builder/${service.id}`);
  };
  const deleteTemplate = async (template: Service) => {
    await ServiceStorage.deleteService(template.id);
    await loadServices();
    toast(`Template “${templateName(template)}” deleted`, {
      action: { label: 'Undo', onClick: () => void ServiceStorage.saveService(template).then(loadServices) },
    });
  };

  const todayServices = getServicesForDate(selectedDate);
  const templates = services.filter((sv) => sv.isTemplate);

  const upcoming = services
    .filter((s) => !s.isTemplate && new Date(s.date).setHours(23, 59) >= Date.now())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime))
    .slice(0, 6);
  const dayLabel = (d: Date) => new Date(d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <AppShell
      title="Services"
      subtitle="Plan each service ahead, then present it on the day. The live screen follows today's order."
      actions={
        <>
          <Button variant="ghost" onClick={toggleSamples} title={hasSamples ? 'Remove the sample services and songs the app came with' : 'Add sample services and songs to try the app with'}>
            {hasSamples ? 'Remove samples' : 'Add samples'}
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input type="file" accept={`${SERVICE_EXPORT_EXTENSION},.json,application/json`} className="hidden" onChange={handleImportService} />
            </label>
          </Button>
          <Button onClick={handleCreateService}>
            <Plus className="w-4 h-4" />
            New service
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6">
          <Section padded={false} className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={{ planned: services.filter((s) => !s.isTemplate).map((s) => new Date(s.date)) }}
              modifiersClassNames={{ planned: 'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary' }}
              className="w-full p-1"
              classNames={{
                months: 'w-full',
                month: 'w-full space-y-3',
                head_row: 'flex w-full',
                head_cell: 'flex-1 text-muted-foreground text-xs font-medium',
                row: 'flex w-full mt-1',
                cell: 'flex-1 relative p-0 text-center text-sm',
                day: 'relative w-full h-10 rounded-[10px] text-sm hover:bg-muted transition',
                day_selected: '!bg-foreground !text-background hover:!bg-foreground font-semibold',
                day_today: 'font-bold ring-1 ring-inset ring-border',
                caption_label: 'text-[15px] font-semibold',
              }}
            />
            {!isToday && (
              <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setSelectedDate(new Date())}>
                Back to today
              </Button>
            )}
          </Section>

          <Section title="Coming up">
            {upcoming.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">Nothing planned yet.</p>
            ) : (
              <div className="space-y-1 -mx-2">
                {upcoming.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedDate(new Date(s.date))}
                    className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
                  >
                    <span className="w-11 h-11 rounded-xl bg-muted grid place-items-center leading-none flex-shrink-0">
                      <span className="text-center">
                        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">{new Date(s.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="block text-[17px] font-bold">{new Date(s.date).getDate()}</span>
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString(undefined, { weekday: 'long' })} · {s.startTime}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6 min-w-0">
          <Section title={isToday ? `Today · ${dayLabel(selectedDate)}` : dayLabel(selectedDate)}>
            {todayServices.length === 0 ? (
              <div className="rounded-xl bg-muted/40 px-6 py-10 text-center">
                <p className="m-0 text-[15px] font-semibold">Nothing planned for this day</p>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Start a blank service, or pick an order of service below.</p>
                <Button className="mt-4" onClick={handleCreateService}>
                  <Plus className="w-4 h-4" />
                  New service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayServices.map((service) => {
                  const parts = timelineParts(service);
                  const minutes = parts.reduce((t, p) => t + p.minutes, 0);
                  const items = service.sections?.reduce((t, sec) => t + sec.subsections.length, 0) ?? 0;
                  return (
                    <div key={service.id} className="rounded-xl bg-muted/40 p-4 hover:bg-muted/60 transition">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/service-builder/${service.id}`)}>
                          <span className="flex items-center gap-2 text-[17px] font-semibold min-w-0">
                            <span className="truncate">{service.name.replace(/^Sample: /, '')}</span>
                            {service.sample && <span className="flex-shrink-0 h-6 px-2 rounded-full bg-primary/20 text-[12px] font-semibold grid place-items-center">Sample</span>}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {service.startTime} · {items} item{items === 1 ? '' : 's'}
                            {minutes > 0 && ` · about ${minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}` : `${minutes} min`}`}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => handleDuplicateService(service)} title="Copy for next Sunday">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleExportService(service)} title="Save to a file">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteService(service.id)} title="Delete this service" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/service-builder/${service.id}`)}>
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button size="sm" onClick={() => navigate(`/presenter?service=${service.id}`)}>
                            <Monitor className="w-4 h-4" />
                            Present
                          </Button>
                        </div>
                      </div>
                      {parts.length > 0 && (
                        <div className="flex gap-[3px] mt-3.5 h-2" aria-label="Order of service">
                          {parts.map((p) => (
                            <span key={p.item.id} title={`${p.item.name} · ${p.minutes} min`} className="rounded-full" style={{ flex: p.minutes, background: p.color }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            title="Service templates"
            description="A starting order for each type of service you run. Make one from the ready-made order for its type, from a service you planned, or from nothing."
            actions={
              <Button onClick={() => openNewTemplate()} data-new-template>
                <Plus className="w-4 h-4" />
                New template
              </Button>
            }
          >
            {templates.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" data-templates>
                {[...templates]
                  .sort((a, b) => serviceType(a).localeCompare(serviceType(b)) || templateName(a).localeCompare(templateName(b)))
                  .map((template) => (
                    <div key={template.id} className="rounded-xl bg-muted/40 p-4 flex flex-col gap-1" data-template={templateName(template)}>
                      <TypePill type={serviceType(template)} />
                      <span className="font-semibold text-[15px]">{templateName(template)}</span>
                      <span className="text-[13px] text-muted-foreground">{summaryOf(template)}</span>
                      <OrderBar service={template} />
                      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2.5">
                        <Button size="sm" onClick={() => planFromTemplate(template)} data-use-template>
                          Use for {shortDay(selectedDate)}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/service-builder/${template.id}`)} title="Change this template">
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => deleteTemplate(template)} title="Delete this template" aria-label={`Delete ${templateName(template)}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No templates yet. Start with the ready-made order for one of your types of service below, and make it your own.</p>
            )}
          </Section>

          <Section title="Ready-made orders" description="One for each type of service, with a typical length for each part, so the live screen’s timeline and timers are ready. Use one as it is, or make it your own template.">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" data-ready-orders>
              {STARTER_SERVICES.map((starter) => (
                <div key={starter.id} className="rounded-xl bg-muted/40 p-4 flex flex-col gap-1" data-ready-order={starter.type}>
                  <TypePill type={starter.type} />
                  <span className="font-semibold text-[15px]">{starter.name}</span>
                  <span className="text-[13px] text-muted-foreground leading-snug">{starter.description}</span>
                  <OrderBar service={serviceFromStarter(starter, selectedDate)} />
                  <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2.5">
                    <Button size="sm" variant="secondary" onClick={() => handleStarter(starter)}>
                      Use for {shortDay(selectedDate)}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openNewTemplate(starter.type)} data-make-template={starter.type}>
                      <Copy className="w-4 h-4" />
                      Make it a template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <TemplateDialog open={templateDialog.open} initialType={templateDialog.type} onOpenChange={(open) => setTemplateDialog((d) => ({ ...d, open }))} services={services} onCreate={createTemplate} />
        </div>
      </div>
    </AppShell>
  );
};

export default ServicePlanner;
