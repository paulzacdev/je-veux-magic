import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Virtues() {
  const { language } = useAuth();
  const { content, loading } = useWeeklyContent(language);

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-center">{t('virtues_to_practice', language)}</h2>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : content?.virtues && content.virtues.length > 0 ? (
          <div className="space-y-3">
            {content.virtues.map((virtue, i) => (
              <Card key={i}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="text-2xl">✨</span>
                  <p className="text-sm leading-relaxed">{virtue}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_content', language)}</p>
        )}
      </div>
    </AppLayout>
  );
}
