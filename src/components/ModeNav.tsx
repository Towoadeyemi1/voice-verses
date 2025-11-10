import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Calendar, Music } from 'lucide-react';

export const ModeNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const modes = [
    {
      path: '/',
      icon: Mic,
      label: 'Scripture',
      description: 'Voice-controlled',
    },
    {
      path: '/service-planner',
      icon: Calendar,
      label: 'Service',
      description: 'Plan services',
    },
    {
      path: '/media-library',
      icon: Music,
      label: 'Media',
      description: 'Manage media',
    },
  ];
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  const handleNavigation = (path: string) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 relative z-10">
      <nav className="flex items-center gap-1 p-1" role="tablist" aria-label="Application modes">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = isActive(mode.path);
          
          return (
            <Button
              key={mode.path}
              onClick={() => handleNavigation(mode.path)}
              variant="ghost"
              size="lg"
              role="tab"
              aria-selected={active}
              aria-label={`${mode.label} mode: ${mode.description}`}
              className={`
                flex-1 h-auto px-2 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-3 transition-all cursor-pointer
                ${active 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                  : 'hover:bg-muted/50'
                }
              `}
              style={{ pointerEvents: 'auto' }}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" aria-hidden="true" />
              <div className="text-left min-w-0 pointer-events-none">
                <div className="font-semibold text-xs sm:text-sm truncate">{mode.label}</div>
                <div className={`text-[10px] sm:text-xs truncate hidden sm:block ${active ? 'opacity-90' : 'text-muted-foreground'}`}>
                  {mode.description}
                </div>
              </div>
            </Button>
          );
        })}
      </nav>
    </Card>
  );
};
