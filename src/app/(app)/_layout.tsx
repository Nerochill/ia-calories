import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

// The app's screens are light-only, so the tab bar stays white even in system dark mode.
const TAB_BAR = {
  background: '#ffffff',
  selected: '#000000',
  unselected: '#8e8e93',
  indicator: '#f0f0f3',
};

export default function AppTabs() {
  const { t } = useTranslation();

  return (
    <NativeTabs
      backgroundColor={TAB_BAR.background}
      blurEffect="systemChromeMaterialLight"
      disableTransparentOnScrollEdge
      shadowColor="#e5e5e5"
      tintColor={TAB_BAR.selected}
      iconColor={{ default: TAB_BAR.unselected, selected: TAB_BAR.selected }}
      labelStyle={{ default: { color: TAB_BAR.unselected }, selected: { color: TAB_BAR.selected } }}
      indicatorColor={TAB_BAR.indicator}
      rippleColor={TAB_BAR.indicator}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="scan">
        <NativeTabs.Trigger.Label>{t('tabs.scan')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'camera', selected: 'camera.fill' }} md="photo_camera" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
