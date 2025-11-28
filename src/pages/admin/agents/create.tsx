/**
 * Create Agent Wizard - Admin Panel
 * 
 * Multi-step wizard for creating a new AI agent with:
 * - Basic info (name, type, description)
 * - Persona configuration
 * - Tool selection
 * - Knowledge sources
 * - Review and create
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAgent } from '@/hooks/use-agents';
import { useOrganizations } from '@/hooks/use-organizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  Sparkles,
  Wrench,
  BookOpen,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';

type Step = 'basics' | 'persona' | 'tools' | 'knowledge' | 'review';

interface FormData {
  // Step 1: Basics
  name: string;
  description: string;
  type: string;
  category: string;
  is_public: boolean;
  // Step 2: Persona
  persona_name: string;
  system_prompt: string;
  temperature: number;
  communication_style: string;
  personality_traits: string[];
  // Step 3: Tools (ids)
  selected_tools: string[];
  // Step 4: Knowledge (ids)
  selected_knowledge: string[];
}

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Basic Info', icon: <Bot className="h-5 w-5" /> },
  { id: 'persona', label: 'Persona', icon: <Sparkles className="h-5 w-5" /> },
  { id: 'tools', label: 'Tools', icon: <Wrench className="h-5 w-5" /> },
  { id: 'knowledge', label: 'Knowledge', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'review', label: 'Review', icon: <CheckCircle className="h-5 w-5" /> },
];

const AGENT_TYPES = [
  { value: 'assistant', label: 'Assistant', description: 'General purpose helper' },
  { value: 'specialist', label: 'Specialist', description: 'Domain expert (tax, audit, etc.)' },
  { value: 'orchestrator', label: 'Orchestrator', description: 'Coordinates other agents' },
  { value: 'evaluator', label: 'Evaluator', description: 'Reviews and validates work' },
  { value: 'autonomous', label: 'Autonomous', description: 'Operates with minimal supervision' },
];

const COMMUNICATION_STYLES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'technical', label: 'Technical' },
];

const PERSONALITY_TRAITS = [
  'Analytical', 'Creative', 'Patient', 'Direct', 'Empathetic',
  'Methodical', 'Proactive', 'Cautious', 'Collaborative', 'Independent',
];

// Mock data for tools and knowledge sources
const AVAILABLE_TOOLS = [
  { id: '1', name: 'Web Search', category: 'Search' },
  { id: '2', name: 'Document Analysis', category: 'Analysis' },
  { id: '3', name: 'Calculator', category: 'Utility' },
  { id: '4', name: 'Email Sender', category: 'Communication' },
  { id: '5', name: 'Task Creator', category: 'Productivity' },
];

const AVAILABLE_KNOWLEDGE = [
  { id: '1', name: 'Tax Regulations 2024', type: 'document' },
  { id: '2', name: 'Company Policies', type: 'document' },
  { id: '3', name: 'Client Database', type: 'database' },
  { id: '4', name: 'Audit Standards', type: 'document' },
];

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();
  const createAgent = useCreateAgent();
  
  const [currentStep, setCurrentStep] = useState<Step>('basics');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'assistant',
    category: '',
    is_public: false,
    persona_name: 'Default Persona',
    system_prompt: '',
    temperature: 0.7,
    communication_style: 'professional',
    personality_traits: [],
    selected_tools: [],
    selected_knowledge: [],
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!currentOrg) {
      toast({ title: 'Error', description: 'No organization selected', variant: 'destructive' });
      return;
    }

    try {
      await createAgent.mutateAsync({
        organization_id: currentOrg.id,
        name: formData.name,
        description: formData.description,
        type: formData.type as any,
        category: formData.category || undefined,
        is_public: formData.is_public,
      });

      toast({ title: 'Success', description: 'Agent created successfully' });
      navigate('/admin/agents');
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to create agent', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/admin/agents')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agents
        </Button>
        <h1 className="text-3xl font-bold">Create New Agent</h1>
        <p className="text-muted-foreground">
          Set up a new AI agent to assist with your workflows
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
          >
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                step.id === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index < currentStepIndex
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.icon}
              <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div 
                className={`flex-1 h-0.5 mx-2 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`} 
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Basics */}
          {currentStep === 'basics' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tax Assistant, Audit Reviewer"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this agent does..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Agent Type *</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(v) => updateField('type', v)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {AGENT_TYPES.map((type) => (
                    <Label
                      key={type.value}
                      htmlFor={type.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.type === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <div>
                        <span className="font-medium">{type.label}</span>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Tax, Audit, Finance"
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Persona */}
          {currentStep === 'persona' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="persona_name">Persona Name</Label>
                <Input
                  id="persona_name"
                  placeholder="e.g., Expert Advisor, Friendly Helper"
                  value={formData.persona_name}
                  onChange={(e) => updateField('persona_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt *</Label>
                <Textarea
                  id="system_prompt"
                  placeholder="You are an AI assistant specialized in..."
                  value={formData.system_prompt}
                  onChange={(e) => updateField('system_prompt', e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Define the agent's role, capabilities, and behavior guidelines.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Communication Style</Label>
                <Select
                  value={formData.communication_style}
                  onValueChange={(v) => updateField('communication_style', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNICATION_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Temperature: {formData.temperature.toFixed(1)}</Label>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={([v]) => updateField('temperature', v)}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more focused and deterministic. Higher = more creative and varied.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Personality Traits</Label>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_TRAITS.map((trait) => (
                    <Badge
                      key={trait}
                      variant={formData.personality_traits.includes(trait) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const traits = formData.personality_traits.includes(trait)
                          ? formData.personality_traits.filter((t) => t !== trait)
                          : [...formData.personality_traits, trait];
                        updateField('personality_traits', traits);
                      }}
                    >
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Tools */}
          {currentStep === 'tools' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select the tools this agent can use to perform actions.
              </p>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <Label
                    key={tool.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.selected_tools.includes(tool.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.selected_tools.includes(tool.id)}
                      onCheckedChange={(checked) => {
                        const tools = checked
                          ? [...formData.selected_tools, tool.id]
                          : formData.selected_tools.filter((id) => id !== tool.id);
                        updateField('selected_tools', tools);
                      }}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{tool.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {tool.category}
                      </Badge>
                    </div>
                  </Label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Knowledge */}
          {currentStep === 'knowledge' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select knowledge sources the agent can access for context.
              </p>
              <div className="space-y-2">
                {AVAILABLE_KNOWLEDGE.map((source) => (
                  <Label
                    key={source.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.selected_knowledge.includes(source.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.selected_knowledge.includes(source.id)}
                      onCheckedChange={(checked) => {
                        const knowledge = checked
                          ? [...formData.selected_knowledge, source.id]
                          : formData.selected_knowledge.filter((id) => id !== source.id);
                        updateField('selected_knowledge', knowledge);
                      }}
                    />
                    <div className="flex-1">
                      <span className="font-medium">{source.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {source.type}
                      </Badge>
                    </div>
                  </Label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Basic Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd>{formData.name || '-'}</dd>
                  <dt className="text-muted-foreground">Type:</dt>
                  <dd className="capitalize">{formData.type}</dd>
                  <dt className="text-muted-foreground">Category:</dt>
                  <dd>{formData.category || '-'}</dd>
                </dl>
              </div>
              <div>
                <h3 className="font-medium mb-2">Persona</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd>{formData.persona_name}</dd>
                  <dt className="text-muted-foreground">Style:</dt>
                  <dd className="capitalize">{formData.communication_style}</dd>
                  <dt className="text-muted-foreground">Temperature:</dt>
                  <dd>{formData.temperature}</dd>
                </dl>
              </div>
              <div>
                <h3 className="font-medium mb-2">Tools ({formData.selected_tools.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.selected_tools.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No tools selected</span>
                  ) : (
                    formData.selected_tools.map((id) => {
                      const tool = AVAILABLE_TOOLS.find((t) => t.id === id);
                      return tool ? (
                        <Badge key={id} variant="secondary">{tool.name}</Badge>
                      ) : null;
                    })
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Knowledge ({formData.selected_knowledge.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.selected_knowledge.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No knowledge sources selected</span>
                  ) : (
                    formData.selected_knowledge.map((id) => {
                      const source = AVAILABLE_KNOWLEDGE.find((k) => k.id === id);
                      return source ? (
                        <Badge key={id} variant="secondary">{source.name}</Badge>
                      ) : null;
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={isFirstStep}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        {isLastStep ? (
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || createAgent.isPending}
          >
            {createAgent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Agent
          </Button>
        ) : (
          <Button onClick={goNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </main>
  );
}
