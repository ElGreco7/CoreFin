import { Search, Bell, Moon, Sun, Settings, LogOut, Home, LayoutDashboard, ArrowLeftRight, FileText, Target, GraduationCap, MessageSquare, Shield, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface SearchItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  adminOnly?: boolean;
}

const searchableItems: SearchItem[] = [
  { name: 'Início', path: '/home', icon: Home, category: 'Páginas' },
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Páginas' },
  { name: 'Transações', path: '/transactions', icon: ArrowLeftRight, category: 'Páginas' },
  { name: 'Relatórios', path: '/reports', icon: FileText, category: 'Páginas' },
  { name: 'Metas Financeiras', path: '/goals', icon: Target, category: 'Páginas' },
  { name: 'Educação Financeira', path: '/education', icon: GraduationCap, category: 'Páginas' },
  { name: 'CoreChat', path: '/chat', icon: MessageSquare, category: 'Páginas' },
  { name: 'Configurações', path: '/settings', icon: Settings, category: 'Páginas' },
  { name: 'Administração', path: '/admin', icon: Shield, category: 'Páginas', adminOnly: true },
];

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Inicial do nome do usuário (pra avatar)
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  // Label do perfil (admin/viewer mostram o role; user mostra "MEI")
  const subtitle =
    user?.role === 'admin' ? 'Administrador' :
    user?.role === 'viewer' ? 'Visualizador' :
    'MEI';

  // Filtra a busca pra esconder "Administração" pra usuário comum
  const isAdminLike = user?.role === 'admin' || user?.role === 'viewer';
  const filteredItems = searchableItems
    .filter(item => !item.adminOnly || isAdminLike)
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSearchClick = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Toggle Sidebar Button */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-accent transition-colors mr-4"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar páginas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />

          {/* Search Results Dropdown */}
          {showResults && searchQuery && (
            <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {filteredItems.length > 0 ? (
                <div className="py-2">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleSearchClick(item.path)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm text-foreground">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-foreground" />
          ) : (
            <Sun className="w-5 h-5 text-foreground" />
          )}
        </button>

        {/* Notifications */}
        <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full"></span>
        </Link>

        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                {initial}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm text-foreground">{user?.name || 'Usuário'}</div>
                <div className="text-xs text-muted-foreground">{subtitle}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              {user?.email || 'Minha Conta'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive" className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}