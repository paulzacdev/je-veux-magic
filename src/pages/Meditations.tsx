import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t, getDirection } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Meditations() {
  const { language } = useAuth();
  const { content, loading, generating } = useWeeklyContent(language);
  const dir = getDirection(language);

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in" dir={dir}>
        <div className="text-center py-2">
          <h2 className="font-serif text-2xl font-bold">{t('daily_meditation', language)}</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {generating && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-serif italic">
                  {language === 'ar' ? 'جاري توليد التأمل...' :
                   language === 'en' ? 'Generating meditation...' :
                   'Génération de la méditation...'}
                </span>
              </div>
            )}
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : content?.meditation ? (
          <>
            {/* Gospel reference badge */}
            {content.gospel_reference && (
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground text-xs px-3 py-1.5 rounded-full font-medium">
                  📖 {content.gospel_reference}
                </span>
              </div>
            )}

            <Card className="border-accent shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg text-liturgical-violet flex items-center gap-2">
                  🕊 {t('meditations', language)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none leading-relaxed text-foreground">
                  <ReactMarkdown>{content.meditation}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🕊</p>
            <p className="text-muted-foreground">{t('no_content', language)}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
