import { Users, CheckCircle, Circle } from 'lucide-react';

const steps = [
  { id: 1, title: 'Account Setup', description: 'Configure your account settings', completed: true },
  { id: 2, title: 'Team Members', description: 'Invite your team members', completed: true },
  { id: 3, title: 'Connect Services', description: 'Link external services', completed: false },
  { id: 4, title: 'Review & Launch', description: 'Final review before going live', completed: false },
];

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Onboarding
        </h2>
        <p className="text-muted-foreground">
          Complete these steps to set up your workspace
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Getting Started</h3>
          <span className="text-sm text-muted-foreground">2 of 4 completed</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-primary transition-all" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
              step.completed
                ? 'border-primary/20 bg-primary/5'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle className="h-6 w-6 text-primary" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-foreground">{step.title}</h4>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            {!step.completed && (
              <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Start
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
