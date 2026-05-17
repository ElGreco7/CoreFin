import { Link, useLocation } from 'react-router';
import {
  Home,
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Target,
  GraduationCap,
  MessageSquare,
  Shield
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { name: 'Início', path: '/home', icon: Home },
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Transações', path: '/transactions', icon: ArrowLeftRight },
  { name: 'Relatórios', path: '/reports', icon: FileText },
  { name: 'Metas Financeiras', path: '/goals', icon: Target },
  { name: 'Educação Financeira', path: '/education', icon: GraduationCap },
  { name: 'CoreChat', path: '/chat', icon: MessageSquare },
];

const adminNavItem: NavItem = { name: 'Administração', path: '/admin', icon: Shield };

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  // Mostra a seção admin apenas pra admin e viewer
  const showAdminSection = user?.role === 'admin' || user?.role === 'viewer';

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      {/* Brand - Text Logo */}
      <Link
        to="/home"
        className="flex items-center justify-center px-8 py-6 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors group"
      >
        {isOpen ? (
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              CoreFin
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Gestão Financeira
            </div>
          </div>
        ) : (
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            CF
          </div>
        )}
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              title={!isOpen ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Admin Section - aparece só pra admin/viewer */}
      {showAdminSection && (
        <div className="px-4 pb-4 border-t border-sidebar-border pt-4">
          <Link
            to={adminNavItem.path}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              (location.pathname === adminNavItem.path || location.pathname.startsWith(adminNavItem.path + '/'))
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
            title={!isOpen ? adminNavItem.name : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>{adminNavItem.name}</span>}
          </Link>
        </div>
      )}

      {/* Footer */}
      {isOpen && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground text-center">
            © 2026 CoreFin
          </div>
        </div>
      )}
    </div>
  );
}