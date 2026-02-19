import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { t, getDirection } from '@/lib/i18n';
import { BookOpen, Heart, MessageCircle, User, Home, HandHeart, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { language } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dir = getDirection(language);
  const { theme, setTheme } = useTheme();

  const navItems = [
    { path: '/dashboard', icon: Home, label: t('dashboard', language) },
    { path: '/gospel', icon: BookOpen, label: t('gospel', language) },
    { path: '/prayers', icon: HandHeart, label: t('prayers', language) },
    { path: '/chatbot', icon: MessageCircle, label: t('chatbot', language) },
    { path: '/profile', icon: User, label: t('profile', language) },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3 px-4">
          <div className="w-9" />
          <div className="text-center">
            <h1 className="text-lg font-serif font-semibold text-primary">✝ {t('app_title', language)}</h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">{t('app_subtitle', language)}</p>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-full border border-border bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />
            }
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container py-4 pb-24 max-w-lg mx-auto px-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/60 z-50">
        <div className="container flex justify-around py-2 max-w-lg mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
