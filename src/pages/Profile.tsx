import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { t, Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Profile() {
  const { profile, language, setLanguage, signOut, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);
    toast.success('✓');
    setSaving(false);
  };

  const langs: { code: Language; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'عربي' },
    { code: 'en', label: 'English' },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-center">{t('profile', language)}</h2>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">{t('display_name', language)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {t('save', language)}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">{t('language', language)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {langs.map(l => (
              <Button
                key={l.code}
                variant={language === l.code ? 'default' : 'outline'}
                className="w-full"
                onClick={() => setLanguage(l.code)}
              >
                {l.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full" onClick={signOut}>
          {t('logout', language)}
        </Button>
      </div>
    </AppLayout>
  );
}
