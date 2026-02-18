import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t, getDirection } from '@/lib/i18n';
import { getCurrentWeekStart } from '@/lib/weekHelper';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Gospel() {
  const { language } = useAuth();
  const { content, loading, generating } = useWeeklyContent(language);
  const dir = getDirection(language);


  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in" dir={dir}>
        <div className="text-center py-2">
          <h2 className="font-serif text-2xl font-bold">{t('gospel_of_week', language)}</h2>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{t('week_of', language)} {getCurrentWeekStart()}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {generating && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-serif italic">
                  {language === 'ar' ? 'جاري توليد المحتوى الروحي...' :
                   language === 'en' ? 'Generating spiritual content...' :
                   'Génération du contenu spirituel en cours...'}
                </span>
              </div>
            )}
            <Skeleton className="h-8 w-2/3 mx-auto" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : content ? (
          <>
            {/* Gospel Text */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-xl text-primary flex items-center gap-2">
                  📖 {content.gospel_reference}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-xl p-4 border border-border">
                  <p className="leading-relaxed text-sm whitespace-pre-line font-serif text-foreground italic">
                    {content.gospel_text}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Patristic Commentary */}
            {content.commentary && (
              <Card className="border-accent shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg text-liturgical-violet flex items-center gap-2">
                    📜 {t('commentary', language)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                    <ReactMarkdown>{content.commentary}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Christian Advice */}
            {content.christian_advice && content.christian_advice.length > 0 && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg text-primary flex items-center gap-2">
                    💡 {t('christian_advice', language)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {content.christian_advice.map((advice, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-primary font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <span className="leading-relaxed">{advice}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">✝</p>
            <p className="text-muted-foreground">{t('no_content', language)}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
