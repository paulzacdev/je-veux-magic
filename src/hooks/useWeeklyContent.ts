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

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const weekStart = getCurrentWeekStart();
      const { data } = await supabase
        .from('weekly_content')
        .select('*')
        .eq('week_start', weekStart)
        .eq('language', language)
        .single();

      if (data) {
        setContent({
          ...data,
          virtues: data.virtues as string[] | null,
          christian_advice: data.christian_advice as string[] | null,
        });
      } else {
        // Generate content via edge function
        try {
          const { data: genData } = await supabase.functions.invoke('generate-content', {
            body: { language, weekStart },
          });
          if (genData?.content) {
            setContent(genData.content);
          }
        } catch (e) {
          console.error('Failed to generate content:', e);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [language]);

  return { content, loading };
}
