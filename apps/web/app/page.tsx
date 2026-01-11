import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export default async function HomePage() {
  // Check if user might be authenticated (cookie exists)
  // Actual auth check happens in middleware
  const cookieStore = await cookies();
  const hasSession = cookieStore.get('sb-access-token') || cookieStore.get('sb-refresh-token');

  if (hasSession) {
    redirect('/app');
  } else {
    redirect('/login');
  }
}
