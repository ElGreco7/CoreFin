import { MessageSquare, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useState } from 'react';

const allowedPaths = ['/home', '/dashboard', '/transactions', '/reports', '/goals', '/education'];

export function CoreChatButton() {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Only show on specified screens
  if (!allowedPaths.includes(location.pathname)) {
    return null;
  }

  // Don't show if already on chat page
  if (location.pathname === '/chat') {
    return null;
  }

  return (
    <Link
      to="/chat"
      className="fixed bottom-6 right-6 z-50 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      <div
        className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-card border border-border rounded-lg px-4 py-2 shadow-lg transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
        }`}
      >
        <div className="text-sm text-foreground font-medium">CoreChat</div>
        <div className="text-xs text-muted-foreground">Assistente financeiro IA</div>
      </div>

      {/* Button */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity"></div>
        
        {/* Main button */}
        <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-full shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <MessageSquare className="w-6 h-6 text-white" />
          
          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </Link>
  );
}
