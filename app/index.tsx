import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const { user } = useAuthStore();
  return <Redirect href={user ? '/(app)/history' : '/login'} />;
}
