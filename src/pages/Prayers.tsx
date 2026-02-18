import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t, getDirection } from '@/lib/i18n';
import { getDayOfWeekIndex, getDayName } from '@/lib/weekHelper';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface Prayer {
  prayer_title: string;
  prayer_text: string;
  day_of_week: number;
}

export default function Prayers() {
  const { language } = useAuth();
  const { content, loading: contentLoading, generating } = useWeeklyContent(language);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const dayIndex = getDayOfWeekIndex();
  const dir = getDirection(language);

  useEffect(() => {
    if (contentLoading) return;
    if (!content?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('daily_prayers')
      .select('*')
      .eq('weekly_content_id', content.id)
      .eq('day_of_week', dayIndex)
      .then(({ data }) => {
        if (data) setPrayers(data);
        setLoading(false);
      });
  }, [content?.id, dayIndex, contentLoading]);

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in" dir={dir}>
        <div className="text-center py-2">
          <h2 className="font-serif text-2xl font-bold">{t('daily_prayers', language)}</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            🗓 {getDayName(dayIndex, language)}
          </p>
        </div>

        {loading || contentLoading ? (
          <div className="space-y-3">
            {generating && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-serif italic">
                  {language === 'ar' ? 'جاري توليد الصلوات...' :
                   language === 'en' ? 'Generating prayers...' :
                   'Génération des prières...'}
                </span>
              </div>
            )}
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : prayers.length > 0 ? (
          <div className="space-y-4">
            {prayers.map((prayer, i) => (
              <Card key={i} className="border-accent shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg text-liturgical-violet flex items-center gap-2">
                    🙏 {prayer.prayer_title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <p className="text-sm leading-relaxed whitespace-pre-line font-serif italic text-foreground">
                      {prayer.prayer_text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🙏</p>
            <p className="text-muted-foreground">{t('no_content', language)}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
