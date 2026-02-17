import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { t, getDirection } from '@/lib/i18n';
import { BookOpen, Heart, MessageCircle, User, Home, Sparkles, HandHeart } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { language, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dir = getDirection(language);

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
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-center py-3">
          <div className="text-center">
            <h1 className="text-lg font-serif font-semibold text-primary">✝ {t('app_title', language)}</h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">{t('app_subtitle', language)}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container py-4 pb-20 animate-fade-in">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t z-50">
        <div className="container flex justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
