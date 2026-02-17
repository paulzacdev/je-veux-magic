import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t } from '@/lib/i18n';
import { getCurrentWeekStart } from '@/lib/weekHelper';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';

export default function Gospel() {
  const { language } = useAuth();
  const { content, loading } = useWeeklyContent(language);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold">{t('gospel_of_week', language)}</h2>
          <p className="text-sm text-muted-foreground">{t('week_of', language)} {getCurrentWeekStart()}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : content ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg text-primary">
                  📖 {content.gospel_reference}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-sm whitespace-pre-line">{content.gospel_text}</p>
              </CardContent>
            </Card>

            {content.commentary && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-lg text-liturgical-violet">
                    📜 {t('commentary', language)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <ReactMarkdown>{content.commentary}</ReactMarkdown>
                </CardContent>
              </Card>
            )}

            {content.christian_advice && content.christian_advice.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-lg text-primary">
                    💡 {t('christian_advice', language)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {content.christian_advice.map((advice, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary font-bold">•</span>
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('no_content', language)}</p>
        )}
      </div>
    </AppLayout>
  );
}
