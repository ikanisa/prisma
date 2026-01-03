export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Simple header for chat */}
            <header className="flex h-16 items-center justify-between border-b bg-card px-6">
                <div className="flex items-center gap-3">
                    <a href="/dashboard" className="text-lg font-bold text-primary">
                        Prisma Glow
                    </a>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium">AI Expert Chat</span>
                </div>
                <nav className="flex items-center gap-4">
                    <a
                        href="/dashboard"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        Dashboard
                    </a>
                </nav>
            </header>
            {children}
        </div>
    );
}
