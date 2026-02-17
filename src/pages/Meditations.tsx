import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';

export default function Meditations() {
  const { language } = useAuth();
  const { content, loading } = useWeeklyContent(language);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-center">{t('daily_meditation', language)}</h2>

        {loading ? (
          <Skeleton className="h-60 w-full" />
        ) : content?.meditation ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg text-liturgical-violet">🕊 {t('meditations', language)}</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <ReactMarkdown>{content.meditation}</ReactMarkdown>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_content', language)}</p>
        )}
      </div>
    </AppLayout>
  );
}
