// Spiritual week: Friday to Thursday
export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri
  const diff = day >= 5 ? day - 5 : day + 2; // days since last Friday
  const friday = new Date(now);
  friday.setDate(now.getDate() - diff);
  return friday.toISOString().split('T')[0];
}

export function getDayOfWeekIndex(): number {
  // 0=Friday, 1=Saturday, ..., 6=Thursday
  const jsDay = new Date().getDay();
  return jsDay >= 5 ? jsDay - 5 : jsDay + 2;
}

export function getDayName(index: number, lang: string): string {
  const days: Record<string, string[]> = {
    fr: ['Vendredi', 'Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
    en: ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    ar: ['الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
  };
  return days[lang]?.[index] ?? days.fr[index];
}
