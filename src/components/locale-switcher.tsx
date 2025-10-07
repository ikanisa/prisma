import { useMemo } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function LocaleSwitcher() {
  const { locale, setLocale, availableLocales, t } = useI18n();
  const options = useMemo(() => availableLocales, [availableLocales]);

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{t('locale.switcher.label')}</Label>
      <Select value={locale} onValueChange={(value) => setLocale(value as typeof locale)}>
        <SelectTrigger className="h-8 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
