export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="fixed top-4 left-4 z-[100] px-4 py-2 bg-primary text-primary-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="fixed top-4 left-28 z-[100] px-4 py-2 bg-primary text-primary-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to navigation
      </a>
    </div>
  );
}
