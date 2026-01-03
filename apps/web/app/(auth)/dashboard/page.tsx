import { redirect } from 'next/navigation';

// Redirect old /dashboard to new /app
export default function DashboardRedirect() {
  redirect('/app');
}
