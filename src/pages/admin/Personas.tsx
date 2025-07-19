import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Eye, Plus, Filter, Download, Upload, Search, Sparkles, Brain, MessageSquare, Target, Zap, TrendingUp, Activity, Users, Globe, Settings, Edit, Copy, Trash2, MoreVertical, ChevronDown, ArrowUpDown, Calendar, Clock, BarChart3, PieChart, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PersonaWithAgent {
  id: string;
  agent_id: string;
  language: string;
  tone: string;
  personality: string;
  instructions: string;
  updated_at: string;
  agents: {
    name: string;
    status: string;
  };
}

const personaFormSchema = z.object({
  agent_id: z.string().min(1, "Agent is required"),
  language: z.string().min(1, "Language is required"),
  tone: z.string().min(1, "Tone is required"),
  personality: z.string().min(10, "Personality must be at least 10 characters"),
  instructions: z.string().min(20, "Instructions must be at least 20 characters"),
});

export default function Personas() {
  const [personas, setPersonas] = useState<PersonaWithAgent[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTone, setFilterTone] = useState("all-tones");
  const [filterLanguage, setFilterLanguage] = useState("all-languages");
  const [filterStatus, setFilterStatus] = useState("all-statuses");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof personaFormSchema>>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      agent_id: "",
      language: "en",
      tone: "",
      personality: "",
      instructions: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [personasResult, agentsResult] = await Promise.all([
        supabase
          .from("agent_personas")
          .select(`
            *,
            agents!inner(name, status)
          `)
          .order("updated_at", { ascending: false }),
        supabase
          .from("agents")
          .select("*")
          .eq("status", "active")
      ]);

      if (personasResult.error) throw personasResult.error;
      if (agentsResult.error) throw agentsResult.error;

      setPersonas(personasResult.data || []);
      setAgents(agentsResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async (values: z.infer<typeof personaFormSchema>) => {
    setCreating(true);
    try {
      const { error } = await supabase
        .from("agent_personas")
        .insert([values]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona created successfully",
      });
      
      setShowCreateDialog(false);
      form.reset();
      fetchData();
    } catch (error) {
      console.error("Error creating persona:", error);
      toast({
        title: "Error",
        description: "Failed to create persona",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicatePersona = async (persona: PersonaWithAgent) => {
    try {
      const { error } = await supabase
        .from("agent_personas")
        .insert([{
          agent_id: persona.agent_id,
          language: persona.language,
          tone: `${persona.tone} (Copy)`,
          personality: persona.personality,
          instructions: persona.instructions,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona duplicated successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error("Error duplicating persona:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate persona",
        variant: "destructive"
      });
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    try {
      const { error } = await supabase
        .from("agent_personas")
        .delete()
        .eq("id", personaId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Persona deleted successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error("Error deleting persona:", error);
      toast({
        title: "Error",
        description: "Failed to delete persona",
        variant: "destructive"
      });
    }
  };

  // Analytics calculations
  const totalPersonas = personas.length;
  const activePersonas = personas.filter(p => p.agents?.status === 'active').length;
  const languageStats = personas.reduce((acc, p) => {
    acc[p.language] = (acc[p.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const toneStats = personas.reduce((acc, p) => {
    acc[p.tone] = (acc[p.tone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtering and sorting
  const filteredPersonas = personas
    .filter(persona => {
      const matchesSearch = 
        persona.agents?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.tone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.personality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.language?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTone = filterTone === "all-tones" || persona.tone === filterTone;
      const matchesLanguage = filterLanguage === "all-languages" || persona.language === filterLanguage;
      const matchesStatus = filterStatus === "all-statuses" || persona.agents?.status === filterStatus;

      return matchesSearch && matchesTone && matchesLanguage && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "name":
          aValue = a.agents?.name || "";
          bValue = b.agents?.name || "";
          break;
        case "tone":
          aValue = a.tone;
          bValue = b.tone;
          break;
        case "language":
          aValue = a.language;
          bValue = b.language;
          break;
        default:
          aValue = a.updated_at;
          bValue = b.updated_at;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  const handlePersonaClick = (personaId: string) => {
    navigate(`/admin/personas/${personaId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterTone("all-tones");
    setFilterLanguage("all-languages");
    setFilterStatus("all-statuses");
    setSortBy("updated_at");
    setSortOrder("desc");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-md w-1/3"></div>
          <div className="h-4 bg-muted rounded-md w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            AI Personas
          </h1>
          <p className="text-muted-foreground mt-1">
            Define personality, tone, and behavior patterns for intelligent AI agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Plus className="w-4 h-4 mr-2" />
                Create Persona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Create New AI Persona
                </DialogTitle>
                <DialogDescription>
                  Define the personality and behavior characteristics for your AI agent
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreatePersona)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                <div className="flex items-center gap-2">
                                  <Bot className="w-4 h-4" />
                                  {agent.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en">🇺🇸 English</SelectItem>
                              <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                              <SelectItem value="fr">🇫🇷 French</SelectItem>
                              <SelectItem value="de">🇩🇪 German</SelectItem>
                              <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
                              <SelectItem value="zh">🇨🇳 Chinese</SelectItem>
                              <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                              <SelectItem value="ko">🇰🇷 Korean</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Communication Tone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                              <SelectItem value="empathetic">Empathetic</SelectItem>
                              <SelectItem value="authoritative">Authoritative</SelectItem>
                              <SelectItem value="humorous">Humorous</SelectItem>
                              <SelectItem value="supportive">Supportive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="personality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personality Traits</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the personality characteristics, behavioral patterns, and core traits that define this AI agent's character..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Define the core personality traits and behavioral patterns
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Behavior Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide detailed instructions on how the AI should behave, respond to users, handle different scenarios..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Specific guidelines and instructions for AI behavior
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create Persona
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Personas</p>
                <p className="text-2xl font-bold">{totalPersonas}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Brain className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Personas</p>
                <p className="text-2xl font-bold">{activePersonas}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Languages</p>
                <p className="text-2xl font-bold">{Object.keys(languageStats).length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tone Variants</p>
                <p className="text-2xl font-bold">{Object.keys(toneStats).length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search personas by name, tone, personality..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={filterTone} onValueChange={setFilterTone}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-tones">All Tones</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-languages">All Languages</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                  <SelectItem value="name">Agent Name</SelectItem>
                  <SelectItem value="tone">Tone</SelectItem>
                  <SelectItem value="language">Language</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>

              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personas Grid */}
      {filteredPersonas.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No personas found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterTone !== "all-tones" || filterLanguage !== "all-languages" || filterStatus !== "all-statuses"
                    ? "Try adjusting your filters or search terms"
                    : "Create your first AI persona to get started"
                  }
                </p>
              </div>
              {!searchTerm && filterTone === "all-tones" && filterLanguage === "all-languages" && filterStatus === "all-statuses" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Persona
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map((persona) => (
            <Card 
              key={persona.id}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20"
              onClick={() => handlePersonaClick(persona.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{persona.agents?.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={persona.agents?.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {persona.agents?.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {persona.language.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handlePersonaClick(persona.id);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePersona(persona);
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePersona(persona.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Tone</span>
                    <Badge variant="outline" className="capitalize">
                      {persona.tone}
                    </Badge>
                  </div>
                  
                  {persona.personality && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Personality</span>
                      <p className="text-sm mt-1 text-foreground/80 line-clamp-3 leading-relaxed">
                        {persona.personality.length > 120 
                          ? persona.personality.substring(0, 120) + "..." 
                          : persona.personality
                        }
                      </p>
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated {new Date(persona.updated_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3" />
                    View Details
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}