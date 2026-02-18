import { useAuth } from '@/hooks/useAuth';
import { useWeeklyContent } from '@/hooks/useWeeklyContent';
import { t, getDirection } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const virtueIcons = ['✨', '🌿', '💛', '🕊', '🌟', '🙏', '💪'];

export default function Virtues() {
  const { language } = useAuth();
  const { content, loading } = useWeeklyContent(language);
  const dir = getDirection(language);

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in" dir={dir}>
        <div className="text-center py-2">
          <h2 className="font-serif text-2xl font-bold">{t('virtues_to_practice', language)}</h2>
          {content?.gospel_reference && (
            <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs px-3 py-1.5 rounded-full font-medium mt-2">
              📖 {content.gospel_reference}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : content?.virtues && content.virtues.length > 0 ? (
          <div className="space-y-3">
            {content.virtues.map((virtue, i) => (
              <Card key={i} className="border-border shadow-sm">
                <CardContent className="flex items-start gap-4 p-4">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{virtueIcons[i % virtueIcons.length]}</span>
                  <p className="text-sm leading-relaxed flex-1">{virtue}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">✨</p>
            <p className="text-muted-foreground">{t('no_content', language)}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
