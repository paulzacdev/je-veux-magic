import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

const languages: { code: Language; label: string; native: string }[] = [
  { code: 'ar', label: 'Arabic', native: 'عربي' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'en', label: 'English', native: 'English' },
];

export default function LanguageSelect() {
  const { setLanguage } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (lang: Language) => {
    await setLanguage(lang);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-5xl mb-4">✝</p>
        <h1 className="font-serif text-2xl font-bold text-primary mb-2">Choisissez votre langue</h1>
        <p className="text-muted-foreground text-sm mb-8">اختر لغتك · Choose your language</p>
        <div className="space-y-3">
          {languages.map(({ code, native }) => (
            <Button
              key={code}
              variant="outline"
              className="w-full h-14 text-lg font-medium border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleSelect(code)}
            >
              {native}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
