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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 mb-4 sm:mb-6">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
        <img 
          src={`${import.meta.env.BASE_URL}cornerstone-logo.png`} 
          alt="Cornerstone Bible Logo" 
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 object-contain flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 truncate">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
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
          className="gradient-divine shadow-glow flex-1 sm:flex-none"
          aria-label="Open presentation control"
        >
          <Presentation className="w-4 h-4 sm:mr-2" aria-hidden="true" />
          <span className="text-sm sm:text-base">Presenter</span>
        </Button>
      </div>
    </div>
  );
};
