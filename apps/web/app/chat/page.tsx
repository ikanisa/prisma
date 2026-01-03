import { redirect } from 'next/navigation';

// Redirect /chat to /app (use command palette for AI)
export default function ChatRedirect() {
    redirect('/app');
}
