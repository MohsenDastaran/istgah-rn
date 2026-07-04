import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { CITIES, useCity, CITY_IDS } from '@/lib/city-context';
import { useI18n, type Lang } from '@/lib/i18n';
import type { CityId } from '@/lib/cities';
import {
  CircleAlert,
  Code,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Palette,
  Settings,
  User2,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Uniwind, useUniwind } from 'uniwind';

// ─── Section divider ──────────────────────────────────────────────────────────
function Divider() {
  return <View className="bg-border h-px" />;
}

// ─── Settings row (label + control) ──────────────────────────────────────────
function SettingsRow({
  icon: IconComp,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 rtl:flex-row-reverse">
      <View className="flex-1 flex-row items-center gap-2 rtl:flex-row-reverse">
        <Icon as={IconComp} className="text-muted-foreground size-4" />
        <Text className="text-sm font-medium">{label}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Link-style footer button ─────────────────────────────────────────────────
function FooterLinkTrigger({
  icon: IconComp,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2.5 rounded-md px-1 py-2 active:opacity-60 rtl:flex-row-reverse">
      <Icon as={IconComp} className="text-muted-foreground size-4" />
      <Text className="text-muted-foreground text-sm">{label}</Text>
    </Pressable>
  );
}

// ─── Report Issue Dialog ──────────────────────────────────────────────────────
function ReportIssueDialog() {
  const { t, isRTL } = useI18n();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <View>
          <FooterLinkTrigger
            icon={CircleAlert}
            label={t.reportIssue}
            onPress={() => setOpen(true)}
          />
        </View>
      </DialogTrigger>
      <DialogContent style={isRTL ? { direction: 'rtl' } : undefined}>
        <DialogHeader>
          <DialogTitle>{t.reportIssue}</DialogTitle>
          <DialogDescription>{t.reportIssueDescription}</DialogDescription>
        </DialogHeader>
        <Text className="text-muted-foreground text-sm leading-relaxed">{t.reportIssueBody}</Text>
        <DialogFooter className="rtl:flex-row-reverse">
          <DialogClose asChild>
            <Button variant="outline">
              <Text>{t.cancel}</Text>
            </Button>
          </DialogClose>
          <Button
            className="rtl:flex-row-reverse"
            onPress={() => {
              Linking.openURL('https://github.com/MohsenDastaran/istgah-rn/issues/new');
              setOpen(false);
            }}>
            <Icon as={ExternalLink} className="text-primary-foreground size-4" />
            <Text>{t.openGitHubIssues}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── About Dialog ─────────────────────────────────────────────────────────────
const ABOUT_FEATURE_KEYS = [
  'aboutFeatureMetroBrtBus',
  'aboutFeatureMultiCity',
  'aboutFeatureRouting',
  'aboutFeatureI18n',
  'aboutFeatureTheme',
  'aboutFeatureOffline',
] as const;

function AboutDialog() {
  const { t, isRTL } = useI18n();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <View>
          <FooterLinkTrigger icon={Info} label={t.about} onPress={() => setOpen(true)} />
        </View>
      </DialogTrigger>
      <DialogContent style={isRTL ? { direction: 'rtl' } : undefined}>
        <DialogHeader>
          <DialogTitle>{t.aboutTitle}</DialogTitle>
          <DialogDescription>{t.aboutDescription}</DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          <View className="gap-1">
            <Text className="text-foreground text-sm font-semibold">{t.developer}</Text>
            <Text className="text-muted-foreground text-sm">{t.developerName}</Text>
          </View>

          <View className="gap-1">
            <Text className="text-foreground text-sm font-semibold">{t.whatIsIstgah}</Text>
            <Text className="text-muted-foreground text-sm leading-relaxed">{t.aboutBody}</Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-foreground text-sm font-semibold">{t.aboutFeaturesTitle}</Text>
            {ABOUT_FEATURE_KEYS.map((key) => (
              <Text key={key} className="text-muted-foreground text-sm leading-relaxed">
                {'\u2022 '}
                {t[key]}
              </Text>
            ))}
          </View>
        </View>

        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => Linking.openURL('https://github.com/MohsenDastaran')}>
            <Icon as={User2} className="text-foreground size-4" />
            <Text>{t.developerGitHub}</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => Linking.openURL('https://github.com/MohsenDastaran/istgah-rn')}>
            <Icon as={Code} className="text-foreground size-4" />
            <Text>{t.appSourceCode}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
export function SettingsPanel() {
  const { t, lang, setLang, isRTL } = useI18n();
  const { cityId, setCity } = useCity();
  const { theme } = useUniwind();
  const insets = useSafeAreaInsets();

  const contentInsets = {
    top: insets.top,
    bottom: Platform.select({ ios: insets.bottom, android: insets.bottom + 24 }) ?? 0,
    left: 16,
    right: 16,
  };

  const langOptions: Option[] = [
    { value: 'en', label: t.english },
    { value: 'fa', label: t.persian },
  ];

  const themeOptions: Option[] = [
    { value: 'light', label: t.themeLight },
    { value: 'dark', label: t.themeDark },
  ];

  const cityOptions: Option[] = CITY_IDS.map((id) => ({
    value: id,
    label: CITIES[id].name[lang],
  }));

  const selectedLang = langOptions.find((o) => o.value === lang);
  const selectedTheme = themeOptions.find((o) => o.value === (theme ?? 'light'));
  const selectedCity = cityOptions.find((o) => o.value === cityId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full active:bg-foreground/10"
          accessibilityLabel={t.settings}>
          <Icon as={Settings} className="text-foreground size-[22px]" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72"
        style={isRTL ? { direction: 'rtl' } : undefined}
        side="bottom"
        align={isRTL ? 'start' : 'end'}>
        <View className="gap-4">
          <Text className="text-foreground text-base font-semibold">{t.settings}</Text>

          <SettingsRow icon={Globe} label={t.language}>
            <Select value={selectedLang} onValueChange={(opt) => opt && setLang(opt.value as Lang)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t.language} />
              </SelectTrigger>
              <SelectContent insets={contentInsets} className="w-32">
                <SelectGroup>
                  {langOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow icon={Palette} label={t.theme}>
            <Select
              value={selectedTheme}
              onValueChange={(opt) => opt && Uniwind.setTheme(opt.value as 'light' | 'dark')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t.theme} />
              </SelectTrigger>
              <SelectContent insets={contentInsets} className="w-32">
                <SelectGroup>
                  {themeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow icon={MapPin} label={t.defaultCity}>
            <Select
              value={selectedCity}
              onValueChange={(opt) => opt && setCity(opt.value as CityId)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t.defaultCity} />
              </SelectTrigger>
              <SelectContent insets={contentInsets} className="w-36">
                <SelectGroup>
                  {cityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingsRow>

          <Divider />

          <View className="gap-0.5">
            <ReportIssueDialog />
            <AboutDialog />
          </View>
        </View>
      </PopoverContent>
    </Popover>
  );
}
