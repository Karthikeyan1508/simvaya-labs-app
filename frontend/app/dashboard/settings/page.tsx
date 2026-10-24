import { AccountSettings } from '@/components/dashboard/account-settings';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function SettingsPage() {
  return <AccountSettings />;
}
