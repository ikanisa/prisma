import { ChatInterface } from '@/components/features/chat';

export const runtime = 'edge';

export const metadata = {
    title: 'AI Expert Chat - Prisma Glow',
    description: 'Get instant answers about tax, audit, accounting, and corporate matters from AI specialists.',
};

export default function ChatPage() {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            <ChatInterface />
        </div>
    );
}
