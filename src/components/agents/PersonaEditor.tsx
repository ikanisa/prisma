/**
 * PersonaEditor Component
 * 
 * Rich editor for agent personas including:
 * - System prompt editor with syntax highlighting
 * - Personality traits selector
 * - Temperature and other parameter controls
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Save, Wand2, Loader2 } from 'lucide-react';
import type { Persona } from '@/hooks/use-agents';

const COMMUNICATION_STYLES = [
  { value: 'professional', label: 'Professional', description: 'Formal, business-appropriate' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'concise', label: 'Concise', description: 'Brief and to the point' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough explanations' },
  { value: 'technical', label: 'Technical', description: 'Uses technical terminology' },
];

const PERSONALITY_TRAITS = [
  'Analytical', 'Creative', 'Patient', 'Direct', 'Empathetic',
  'Methodical', 'Proactive', 'Cautious', 'Collaborative', 'Independent',
  'Detail-oriented', 'Big-picture', 'Supportive', 'Challenging', 'Adaptive',
];

const PII_HANDLING_OPTIONS = [
  { value: 'redact', label: 'Redact', description: 'Remove PII completely' },
  { value: 'mask', label: 'Mask', description: 'Replace with asterisks' },
  { value: 'warn', label: 'Warn', description: 'Flag but include' },
  { value: 'allow', label: 'Allow', description: 'No special handling' },
];

export interface PersonaEditorProps {
  persona?: Persona;
  onSave: (data: Partial<Persona>) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

export function PersonaEditor({
  persona,
  onSave,
  onCancel,
  saving = false,
}: PersonaEditorProps) {
  const [formData, setFormData] = useState<Partial<Persona>>({
    name: '',
    role: '',
    system_prompt: '',
    personality_traits: [],
    communication_style: 'professional',
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_output_tokens: 4096,
    pii_handling: 'redact',
    is_active: false,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name,
        role: persona.role || '',
        system_prompt: persona.system_prompt,
        personality_traits: persona.personality_traits,
        communication_style: persona.communication_style,
        temperature: persona.temperature,
        top_p: persona.top_p,
        frequency_penalty: persona.frequency_penalty,
        presence_penalty: persona.presence_penalty,
        max_output_tokens: persona.max_output_tokens,
        pii_handling: persona.pii_handling,
        is_active: persona.is_active,
      });
    }
  }, [persona]);

  const updateField = <K extends keyof Persona>(field: K, value: Persona[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTrait = (trait: string) => {
    const traits = formData.personality_traits || [];
    const newTraits = traits.includes(trait)
      ? traits.filter((t) => t !== trait)
      : [...traits, trait];
    updateField('personality_traits', newTraits);
  };

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    // Simulate AI generation - in production, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const generatedPrompt = `You are ${formData.name || 'an AI assistant'}${
      formData.role ? `, serving as a ${formData.role}` : ''
    }.

Your communication style is ${formData.communication_style}.
${formData.personality_traits?.length 
  ? `You exhibit the following personality traits: ${formData.personality_traits.join(', ')}.` 
  : ''}

Guidelines:
- Provide accurate, helpful, and relevant responses
- Be ${formData.communication_style} in your communication
- Always prioritize clarity and user understanding
- Ask clarifying questions when needed
- Acknowledge limitations when appropriate`;

    updateField('system_prompt', generatedPrompt);
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Persona Identity
          </CardTitle>
          <CardDescription>
            Define who this agent persona is
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Persona Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Senior Tax Advisor"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="e.g., Tax compliance specialist"
                value={formData.role}
                onChange={(e) => updateField('role', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Active Persona</Label>
              <p className="text-xs text-muted-foreground">
                Use this persona by default for this agent
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => updateField('is_active', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Define how this persona behaves and responds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeneratePrompt}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              AI Generate
            </Button>
          </div>
          <Textarea
            placeholder="You are an AI assistant specialized in..."
            value={formData.system_prompt}
            onChange={(e) => updateField('system_prompt', e.target.value)}
            rows={10}
            className="font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            {(formData.system_prompt || '').length} characters
          </p>
        </CardContent>
      </Card>

      {/* Communication Style & Traits */}
      <Card>
        <CardHeader>
          <CardTitle>Personality</CardTitle>
          <CardDescription>
            Define the agent's communication style and traits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Communication Style</Label>
            <Select
              value={formData.communication_style}
              onValueChange={(v) => updateField('communication_style', v as Persona['communication_style'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNICATION_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div>
                      <span className="font-medium">{style.label}</span>
                      <span className="text-muted-foreground ml-2">
                        — {style.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Personality Traits</Label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TRAITS.map((trait) => (
                <Badge
                  key={trait}
                  variant={formData.personality_traits?.includes(trait) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/20"
                  onClick={() => toggleTrait(trait)}
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Model Parameters</CardTitle>
          <CardDescription>
            Fine-tune the AI model behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">
                {formData.temperature?.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[formData.temperature || 0.7]}
              onValueChange={([v]) => updateField('temperature', v)}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Lower = more focused. Higher = more creative.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Top P</Label>
              <span className="text-sm text-muted-foreground">
                {formData.top_p?.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[formData.top_p || 0.9]}
              onValueChange={([v]) => updateField('top_p', v)}
              min={0}
              max={1}
              step={0.05}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Output Tokens</Label>
              <Input
                type="number"
                value={formData.max_output_tokens}
                onChange={(e) => updateField('max_output_tokens', parseInt(e.target.value))}
                min={1}
                max={128000}
              />
            </div>
            <div className="space-y-2">
              <Label>PII Handling</Label>
              <Select
                value={formData.pii_handling}
                onValueChange={(v) => updateField('pii_handling', v as Persona['pii_handling'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PII_HANDLING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving || !formData.name || !formData.system_prompt}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Persona
        </Button>
      </div>
    </form>
  );
}

export default PersonaEditor;
