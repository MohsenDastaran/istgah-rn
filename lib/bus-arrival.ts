import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

/** Tehran bus/BRT arrival inquiry USSD (user pastes the copied station code). */
export const BUS_ARRIVAL_USSD = '*137*3*7*1#';

export async function openBusArrivalUssd(stationCode: string): Promise<void> {
  const code = stationCode.trim();
  if (!code) return;

  await Clipboard.setStringAsync(code);
  await Linking.openURL(`tel:${encodeURIComponent(BUS_ARRIVAL_USSD)}`);
}
