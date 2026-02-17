import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t } from '@/lib/i18n';
import { getDayOfWeekIndex, getDayName } from '@/lib/weekHelper';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Prayer {
  prayer_title: string;
  prayer_text: string;
  day_of_week: number;
}

export default function Prayers() {
  const { language } = useAuth();
  const { content, loading: contentLoading } = useWeeklyContent(language);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const dayIndex = getDayOfWeekIndex();

  useEffect(() => {
    if (!content?.id) { setLoading(false); return; }
    supabase
      .from('daily_prayers')
      .select('*')
      .eq('weekly_content_id', content.id)
      .eq('day_of_week', dayIndex)
      .then(({ data }) => {
        if (data) setPrayers(data);
        setLoading(false);
      });
  }, [content?.id, dayIndex]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold">{t('daily_prayers', language)}</h2>
          <p className="text-sm text-muted-foreground">{getDayName(dayIndex, language)}</p>
        </div>

        {loading || contentLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : prayers.length > 0 ? (
          prayers.map((prayer, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="font-serif text-lg text-primary">🙏 {prayer.prayer_title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line">{prayer.prayer_text}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('no_content', language)}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
