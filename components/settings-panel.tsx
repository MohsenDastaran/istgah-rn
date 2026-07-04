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
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
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
      className="flex-row items-center gap-2.5 rounded-md px-1 py-2 active:opacity-60">
      <Icon as={IconComp} className="text-muted-foreground size-4" />
      <Text className="text-muted-foreground text-sm">{label}</Text>
    </Pressable>
  );
}

// ─── Report Issue Dialog ──────────────────────────────────────────────────────
function ReportIssueDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <View>
          <FooterLinkTrigger
            icon={CircleAlert}
            label="Report an Issue"
            onPress={() => setOpen(true)}
          />
        </View>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Found a bug or want to suggest a new feature? You can open an issue directly on GitHub.
          </DialogDescription>
        </DialogHeader>
        <Text className="text-muted-foreground text-sm leading-relaxed">
          Please describe the problem in as much detail as possible — including what you expected to
          happen, what actually happened, and the steps to reproduce it.
        </Text>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button
            onPress={() => {
              Linking.openURL('https://github.com/MohsenDastaran/istgah-rn/issues/new');
              setOpen(false);
            }}>
            <Icon as={ExternalLink} className="text-primary-foreground size-4" />
            <Text>Open GitHub Issues</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── About Dialog ─────────────────────────────────────────────────────────────
function AboutDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <View>
          <FooterLinkTrigger icon={Info} label="About" onPress={() => setOpen(true)} />
        </View>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About Istgah</DialogTitle>
          <DialogDescription>
            Tehran Metro companion app — offline-ready, fast, and open source.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          <View className="gap-1">
            <Text className="text-foreground text-sm font-semibold">Developer</Text>
            <Text className="text-muted-foreground text-sm">Mohsen Dastaran</Text>
          </View>

          <View className="gap-1">
            <Text className="text-foreground text-sm font-semibold">What is Istgah?</Text>
            <Text className="text-muted-foreground text-sm leading-relaxed">
              Istgah (ایستگاه, meaning "Station") is an open-source mobile app for navigating
              Tehran's metro network. It shows all stations, metro lines, interchanges, and helps
              you get directions.
            </Text>
          </View>
        </View>

        <DialogFooter>
          {/* <DialogClose asChild>
            <Button variant="outline">
              <Text>Close</Text>
            </Button>
          </DialogClose> */}
          <Button
            variant="outline"
            onPress={() => Linking.openURL('https://github.com/MohsenDastaran')}>
            <Icon as={User2} className="text-foreground size-4" />
            <Text>Developer's GitHub Profile</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => Linking.openURL('https://github.com/MohsenDastaran/istgah-rn')}>
            <Icon as={Code} className="text-foreground size-4" />
            <Text>App Source Code</Text>
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
    { value: 'en', label: 'English' },
    { value: 'fa', label: 'فارسی' },
  ];

  const themeOptions: Option[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  const cityOptions: Option[] = CITY_IDS.map((id) => ({
    value: id,
    label: isRTL ? CITIES[id].name.fa : CITIES[id].name.en,
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
          accessibilityLabel="Settings">
          <Icon as={Settings} className="text-foreground size-[22px]" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72" side="bottom" align="end">
        <View className="gap-4">
          {/* Header */}
          <Text className="text-foreground text-base font-semibold">Settings</Text>

          {/* Language */}
          <SettingsRow icon={Globe} label="Language">
            <Select value={selectedLang} onValueChange={(opt) => opt && setLang(opt.value as Lang)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Language" />
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

          {/* Theme */}
          <SettingsRow icon={Palette} label="Theme">
            <Select
              value={selectedTheme}
              onValueChange={(opt) => opt && Uniwind.setTheme(opt.value as 'light' | 'dark')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Theme" />
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

          {/* Default city */}
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

          {/* Footer links */}
          <View className="gap-0.5">
            <ReportIssueDialog />
            <AboutDialog />
          </View>
        </View>
      </PopoverContent>
    </Popover>
  );
}
