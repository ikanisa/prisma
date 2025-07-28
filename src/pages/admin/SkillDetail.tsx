import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SkillDetail {
  id: string;
  skill_name: string;
  skill_description: string;
  usage_count: number;
  last_used_at: string;
  is_active: boolean;
}

export default function SkillDetail() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (skillId) {
      fetchSkillDetail();
    }
  }, [skillId]);

  const fetchSkillDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('omni_agent_skills')
        .select('*')
        .eq('id', skillId)
        .single();

      if (error) throw error;

      setSkill(data);
      setDescription(data.skill_description || "");
      setIsActive(data.is_active);
    } catch (error) {
      console.error('Error fetching skill detail:', error);
      toast.error('Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!skill) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('omni_agent_skills')
        .update({
          skill_description: description,
          is_active: isActive
        })
        .eq('id', skill.id);

      if (error) throw error;

      toast.success('Skill updated successfully');
      setSkill({ ...skill, skill_description: description, is_active: isActive });
    } catch (error) {
      console.error('Error updating skill:', error);
      toast.error('Failed to update skill');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Skill not found</p>
          <Button onClick={() => navigate('/admin/omni-agent')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/omni-agent')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{skill.skill_name}</h1>
          <p className="text-muted-foreground">Configure skill settings and behavior</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Skill Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Active</span>
              <Switch 
                checked={isActive} 
                onCheckedChange={setIsActive}
              />
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Usage Count</span>
              <p className="text-2xl font-bold">{skill.usage_count}</p>
            </div>
            {skill.last_used_at && (
              <div>
                <span className="text-sm text-muted-foreground">Last Used</span>
                <p className="text-sm">{new Date(skill.last_used_at).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Skill Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this skill does..."
                className="mt-1"
                rows={4}
              />
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}