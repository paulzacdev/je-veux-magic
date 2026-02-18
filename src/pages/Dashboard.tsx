import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { getDayName, getDayOfWeekIndex } from '@/lib/weekHelper';
import AppLayout from '@/components/AppLayout';
import { BookOpen, Heart, HandHeart, Sparkles, MessageCircle, ChevronRight } from 'lucide-react';

const cardData = [
  {
    icon: BookOpen,
    key: 'gospel_of_week',
    path: '/gospel',
    gradient: 'from-amber-50 to-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    emoji: '📖',
  },
  {
    icon: Heart,
    key: 'daily_meditation',
    path: '/meditations',
    gradient: 'from-violet-50 to-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    emoji: '🕊',
  },
  {
    icon: HandHeart,
    key: 'daily_prayers',
    path: '/prayers',
    gradient: 'from-blue-50 to-blue-100',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    emoji: '🙏',
  },
  {
    icon: Sparkles,
    key: 'virtues_to_practice',
    path: '/virtues',
    gradient: 'from-emerald-50 to-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    emoji: '✨',
  },
  {
    icon: MessageCircle,
    key: 'chatbot',
    path: '/chatbot',
    gradient: 'from-rose-50 to-rose-100',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    emoji: '💬',
  },
];

export default function Dashboard() {
  const { profile, language } = useAuth();
  const navigate = useNavigate();
  const dayIndex = getDayOfWeekIndex();
  const dayName = getDayName(dayIndex, language);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Hero */}
        <div className="relative text-center py-6 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl" />
          <div className="relative">
            <p className="text-4xl mb-2">✝</p>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {t('welcome', language)}{profile?.display_name ? `, ${profile.display_name}` : ''}
            </h2>
            <p className="text-muted-foreground text-sm mt-1 font-medium">{dayName}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-full font-medium">
              <span>🌿</span>
              <span>{t('spiritual_week', language)} — {t('friday_to_thursday', language)}</span>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-3">
          {cardData.map(({ icon: Icon, key, path, iconBg, iconColor, borderColor, emoji }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border ${borderColor} bg-card hover:shadow-md transition-all duration-200 active:scale-[0.98] text-left`}
            >
              <div className={`flex-shrink-0 p-3 rounded-xl ${iconBg} ${iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-serif text-base font-semibold text-foreground block">
                  {emoji} {t(key, language)}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
