import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { getCurrentWeekStart, getDayName, getDayOfWeekIndex } from '@/lib/weekHelper';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Heart, HandHeart, Sparkles, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const { profile, language } = useAuth();
  const navigate = useNavigate();
  const dayName = getDayName(getDayOfWeekIndex(), language);

  const cards = [
    { icon: BookOpen, label: t('gospel_of_week', language), path: '/gospel', color: 'text-primary' },
    { icon: Heart, label: t('daily_meditation', language), path: '/meditations', color: 'text-liturgical-violet' },
    { icon: HandHeart, label: t('daily_prayers', language), path: '/prayers', color: 'text-primary' },
    { icon: Sparkles, label: t('virtues_to_practice', language), path: '/virtues', color: 'text-liturgical-violet' },
    { icon: MessageCircle, label: t('chatbot', language), path: '/chatbot', color: 'text-primary' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="text-center py-4">
          <h2 className="font-serif text-2xl font-bold">
            {t('welcome', language)}{profile?.display_name ? `, ${profile.display_name}` : ''} ✝
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{dayName}</p>
        </div>

        {/* Navigation Cards */}
        <div className="grid gap-3">
          {cards.map(({ icon: Icon, label, path, color }) => (
            <Card
              key={path}
              className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              onClick={() => navigate(path)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`p-3 rounded-xl bg-muted ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-serif text-lg font-medium">{label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
