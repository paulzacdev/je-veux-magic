import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { t, Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Moon, Sun, User, Globe, LogOut, Save } from 'lucide-react';

export default function Profile() {
  const { profile, language, setLanguage, signOut, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', user.id);
    toast.success(language === 'ar' ? 'تم الحفظ ✓' : language === 'en' ? 'Saved ✓' : 'Enregistré ✓');
    setSaving(false);
  };

  const langs: { code: Language; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'عربي', flag: '🇩🇿' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Avatar / Header */}
        <div className="flex flex-col items-center py-4 space-y-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center text-3xl shadow-inner">
            <User className="h-8 w-8 text-primary/60" />
          </div>
          <p className="font-serif text-xl font-semibold text-foreground">
            {profile?.display_name || (language === 'ar' ? 'الملف الشخصي' : language === 'en' ? 'Profile' : 'Profil')}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        {/* Display Name */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <User className="h-4 w-4 text-primary" />
            <span className="font-serif font-semibold text-sm text-foreground">{t('display_name', language)}</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={language === 'ar' ? 'اسمك' : language === 'en' ? 'Your name' : 'Votre nom'}
              className="rounded-xl"
            />
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gap-2">
              <Save className="h-4 w-4" />
              {t('save', language)}
            </Button>
          </div>
        </section>

        {/* Language */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-serif font-semibold text-sm text-foreground">{t('language', language)}</span>
          </div>
          <div className="px-4 py-4 grid grid-cols-3 gap-2">
            {langs.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all text-sm font-medium ${
                  language === l.code
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <span className="text-xl">{l.flag}</span>
                <span className="text-xs">{l.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            <span className="font-serif font-semibold text-sm text-foreground">
              {language === 'ar' ? 'المظهر' : language === 'en' ? 'Appearance' : 'Apparence'}
            </span>
          </div>
          <div className="px-4 py-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Sun className="h-6 w-6" />
              <span className="text-xs font-medium">
                {language === 'ar' ? 'فاتح' : language === 'en' ? 'Light' : 'Clair'}
              </span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Moon className="h-6 w-6" />
              <span className="text-xs font-medium">
                {language === 'ar' ? 'داكن' : language === 'en' ? 'Dark' : 'Nuit'}
              </span>
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-all text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          {t('logout', language)}
        </button>
      </div>
    </AppLayout>
  );
}
