import { useProfile } from '@/features/auth/session-provider';
import { AdminHome } from '@/features/home/admin-home';
import { MemberHome } from '@/features/home/member-home';

export default function HomeScreen() {
  const profile = useProfile();
  return profile.role === 'admin' ? <AdminHome profile={profile} /> : <MemberHome profile={profile} />;
}
