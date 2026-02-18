import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentWeekStart } from '@/lib/weekHelper';
import { Language } from '@/lib/i18n';

interface WeeklyContent {
  id: string;
  gospel_text: string;
  gospel_reference: string;
  meditation: string | null;
  virtues: string[] | null;
  christian_advice: string[] | null;
  commentary: string | null;
}

export function useWeeklyContent(language: Language) {
  const [content, setContent] = useState<WeeklyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      const weekStart = getCurrentWeekStart();

      // Try to fetch existing content
      const { data } = await supabase
        .from('weekly_content')
        .select('*')
        .eq('week_start', weekStart)
        .eq('language', language)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setContent({
          ...data,
          virtues: data.virtues as string[] | null,
          christian_advice: data.christian_advice as string[] | null,
        });
        setLoading(false);
        return;
      }

      // Generate content via edge function
      setGenerating(true);
      try {
        const { data: genData, error: genError } = await supabase.functions.invoke('generate-content', {
          body: { language, weekStart },
        });

        if (cancelled) return;

        if (genError) throw genError;

        if (genData?.content) {
          setContent({
            ...genData.content,
            virtues: genData.content.virtues as string[] | null,
            christian_advice: genData.content.christian_advice as string[] | null,
          });
        }
      } catch (e: any) {
        console.error('Failed to generate content:', e);
        if (!cancelled) setError(e.message || 'Erreur de génération');
      } finally {
        if (!cancelled) {
          setGenerating(false);
          setLoading(false);
        }
      }
    };

    fetchContent();
    return () => { cancelled = true; };
  }, [language]);

  return { content, loading, generating, error };
}
