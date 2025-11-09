import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, LayoutGrid, MonitorPlay, Presentation } from 'lucide-react';
import { ShowLogoButton } from './ShowLogoButton';

interface PageHeaderProps {
  title: string;
  description?: string;
  showSettings?: boolean;
  onToggleSettings?: () => void;
  showDisplayMonitor?: boolean;
  onToggleDisplayMonitor?: () => void;
  onOpenLowerThird?: () => void;
  actions?: ReactNode;
}

export const PageHeader = ({
  title,
  description,
  showSettings,
  onToggleSettings,
  showDisplayMonitor,
  onToggleDisplayMonitor,
  onOpenLowerThird,
  actions,
}: PageHeaderProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 truncate">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        
        <ShowLogoButton variant="outline" size="default" className="hidden sm:flex" />
        
        {onToggleSettings && (
          <Button
            onClick={onToggleSettings}
            variant="outline"
            size="default"
            aria-label="Toggle settings panel"
            aria-pressed={showSettings}
            className="hidden sm:flex"
          >
            <Settings className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )}
        
        {onToggleDisplayMonitor && (
          <Button
            onClick={onToggleDisplayMonitor}
            variant={showDisplayMonitor ? "default" : "outline"}
            size="default"
            aria-label={showDisplayMonitor ? "Hide display monitor" : "Show display monitor"}
            aria-pressed={showDisplayMonitor}
            className="hidden md:flex"
          >
            <LayoutGrid className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden lg:inline">
              {showDisplayMonitor ? "Hide" : "Show"} Monitor
            </span>
          </Button>
        )}
        
        {onOpenLowerThird && (
          <Button
            onClick={onOpenLowerThird}
            variant="outline"
            size="default"
            aria-label="Open lower third window"
            className="hidden lg:flex"
          >
            <MonitorPlay className="w-4 h-4 sm:mr-2" aria-hidden="true" />
            <span className="hidden xl:inline">Lower Third</span>
          </Button>
        )}
        
        <Button
          onClick={() => navigate('/presenter')}
          size="default"
          className="gradient-divine shadow-glow"
          aria-label="Open presentation control"
        >
          <Presentation className="w-4 h-4 sm:mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">Presenter</span>
        </Button>
      </div>
    </div>
  );
};
