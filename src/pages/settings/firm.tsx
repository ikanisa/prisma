/**
 * Firm Settings Page
 * 
 * Manage firm profile, jurisdiction settings, and user preferences.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building,
    Globe,
    Users,
    Settings,
    Save,
    Loader2,
} from 'lucide-react';

import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const JURISDICTIONS = [
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', active: true },
    { code: 'MT', name: 'Malta', flag: '🇲🇹', active: true },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', active: true },
];

const ENGAGEMENT_TYPES = [
    { type: 'accounting', label: 'Accounting', active: true },
    { type: 'audit', label: 'Audit', active: true },
    { type: 'tax', label: 'Tax', active: true },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function FirmSettings() {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [firmName, setFirmName] = useState('Demo Accounting Firm');
    const [defaultJurisdiction, setDefaultJurisdiction] = useState('RW');
    const [autoplanEnabled, setAutoplanEnabled] = useState(true);
    const [autopilotEnabled, setAutopilotEnabled] = useState(true);

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO: Call API to save settings
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({
                title: 'Settings Saved',
                description: 'Your firm settings have been updated.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to save settings.',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold gradient-text">Firm Settings</h1>
                <p className="text-muted-foreground">
                    Manage your firm's Prisma Core configuration.
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general" className="gap-2">
                        <Building className="h-4 w-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="jurisdictions" className="gap-2">
                        <Globe className="h-4 w-4" />
                        Jurisdictions
                    </TabsTrigger>
                    <TabsTrigger value="automation" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Automation
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Firm Profile</CardTitle>
                            <CardDescription>Basic firm information and defaults.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="firmName">Firm Name</Label>
                                <Input
                                    id="firmName"
                                    value={firmName}
                                    onChange={(e) => setFirmName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Default Jurisdiction</Label>
                                <div className="flex gap-2">
                                    {JURISDICTIONS.map(j => (
                                        <Button
                                            key={j.code}
                                            type="button"
                                            variant={defaultJurisdiction === j.code ? 'default' : 'outline'}
                                            onClick={() => setDefaultJurisdiction(j.code)}
                                            className="gap-2"
                                        >
                                            <span>{j.flag}</span>
                                            <span>{j.code}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Active Engagement Types</Label>
                                <div className="flex gap-2">
                                    {ENGAGEMENT_TYPES.map(t => (
                                        <Badge key={t.type} variant="outline" className="capitalize">
                                            {t.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Jurisdictions Tab */}
                <TabsContent value="jurisdictions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supported Jurisdictions</CardTitle>
                            <CardDescription>
                                Prisma Core supports Rwanda, Malta, and Canada only.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {JURISDICTIONS.map(j => (
                                    <div
                                        key={j.code}
                                        className="flex items-center justify-between p-4 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{j.flag}</span>
                                            <div>
                                                <p className="font-medium">{j.name}</p>
                                                <p className="text-sm text-muted-foreground">{j.code}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Active
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Additional jurisdictions require Prisma Core configuration.
                                Contact support to request new jurisdictions.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Automation Tab */}
                <TabsContent value="automation">
                    <Card>
                        <CardHeader>
                            <CardTitle>AI Automation</CardTitle>
                            <CardDescription>
                                Configure autoplan and autopilot features.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-lg border">
                                <div>
                                    <p className="font-medium">Autoplan</p>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically generate engagement tasks from playbooks.
                                    </p>
                                </div>
                                <Switch
                                    checked={autoplanEnabled}
                                    onCheckedChange={setAutoplanEnabled}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border">
                                <div>
                                    <p className="font-medium">Autopilot</p>
                                    <p className="text-sm text-muted-foreground">
                                        Event-driven automation for document uploads and task updates.
                                    </p>
                                </div>
                                <Switch
                                    checked={autopilotEnabled}
                                    onCheckedChange={setAutopilotEnabled}
                                />
                            </div>

                            <div className="p-4 rounded-lg border bg-muted/50">
                                <p className="text-sm font-medium">Agent Types</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge>Accounting Agent</Badge>
                                    <Badge>Audit Agent</Badge>
                                    <Badge>Tax Agent</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Agents are automatically selected based on engagement type.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button variant="gradient" onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    );
}

export default FirmSettings;
