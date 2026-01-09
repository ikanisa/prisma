/**
 * Client Intake Form with Financial Institution Screening
 * 
 * CRITICAL: This form blocks financial institutions from being onboarded.
 * Only self-employed, micro, small, and medium SMEs in RW/MT/CA are allowed.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Globe,
    Shield,
    Loader2,
    XCircle,
} from 'lucide-react';

import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const JURISDICTIONS = [
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', taxAuthority: 'RRA', currency: 'RWF' },
    { code: 'MT', name: 'Malta', flag: '🇲🇹', taxAuthority: 'CFR', currency: 'EUR' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', taxAuthority: 'CRA', currency: 'CAD' },
] as const;

const CLIENT_SEGMENTS = [
    { value: 'self_employed', label: 'Self-Employed', description: 'Individuals in business' },
    { value: 'micro', label: 'Micro Enterprise', description: '<10 employees' },
    { value: 'small', label: 'Small Enterprise', description: '10-49 employees' },
    { value: 'medium', label: 'Medium Enterprise', description: '50-249 employees' },
] as const;

const ENTITY_TYPES = [
    { value: 'sole_proprietor', label: 'Sole Proprietor' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'private_company', label: 'Private Limited Company' },
    { value: 'llc', label: 'Limited Liability Company' },
    { value: 'cooperative', label: 'Cooperative (non-financial)' },
] as const;

// Keywords that suggest a financial institution
const FI_KEYWORDS = [
    'bank', 'banking', 'mfi', 'microfinance', 'sacco', 'credit union',
    'insurance', 'insurer', 'reinsurance', 'pension fund', 'asset management',
    'investment fund', 'broker', 'forex', 'money transfer', 'mobile money',
];

// ============================================================================
// SCHEMA
// ============================================================================

const clientIntakeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    jurisdiction: z.enum(['RW', 'MT', 'CA'], { required_error: 'Select a jurisdiction' }),
    segment: z.enum(['self_employed', 'micro', 'small', 'medium'], { required_error: 'Select client segment' }),
    entityType: z.string().min(1, 'Select entity type'),
    industryDescription: z.string().min(3, 'Describe the industry/business activity'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    taxId: z.string().optional(),
    vatNumber: z.string().optional(),
});

type ClientIntakeValues = z.infer<typeof clientIntakeSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export function ClientIntake() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [screening, setScreening] = useState<{
        performed: boolean;
        result: 'eligible' | 'ineligible' | 'warning' | null;
        reason: string | null;
        matchedKeywords: string[];
    }>({ performed: false, result: null, reason: null, matchedKeywords: [] });

    const form = useForm<ClientIntakeValues>({
        resolver: zodResolver(clientIntakeSchema),
        defaultValues: {
            name: '',
            jurisdiction: undefined,
            segment: undefined,
            entityType: '',
            industryDescription: '',
            email: '',
            phone: '',
            taxId: '',
            vatNumber: '',
        },
    });

    const watchedName = form.watch('name');
    const watchedIndustry = form.watch('industryDescription');

    // Perform FI screening when name or industry changes
    const performScreening = () => {
        const textToCheck = `${watchedName} ${watchedIndustry}`.toLowerCase();
        const matched = FI_KEYWORDS.filter(kw => textToCheck.includes(kw));

        if (matched.length > 0) {
            setScreening({
                performed: true,
                result: matched.some(kw => ['bank', 'banking', 'insurance', 'mfi', 'microfinance'].includes(kw))
                    ? 'ineligible'
                    : 'warning',
                reason: matched.some(kw => ['bank', 'banking', 'insurance', 'mfi', 'microfinance'].includes(kw))
                    ? 'Financial institutions are not eligible for Prisma Core services.'
                    : 'Industry terms suggest potential financial services. Please confirm this is NOT a regulated financial institution.',
                matchedKeywords: matched,
            });
        } else {
            setScreening({
                performed: true,
                result: 'eligible',
                reason: null,
                matchedKeywords: [],
            });
        }
    };

    const handleSubmit = async (values: ClientIntakeValues) => {
        // Block if ineligible
        if (screening.result === 'ineligible') {
            toast({
                variant: 'destructive',
                title: 'Client Not Eligible',
                description: 'Financial institutions cannot be onboarded to Prisma Core.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // TODO: Call API to create client
            // const client = await createClient({...values, isFinancialInstitution: false })

            console.log('Creating client:', values);

            toast({
                title: 'Client Created',
                description: `${values.name} has been added to your firm.`,
            });

            form.reset();
            setScreening({ performed: false, result: null, reason: null, matchedKeywords: [] });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: (error as Error).message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedJurisdiction = JURISDICTIONS.find(j => j.code === form.watch('jurisdiction'));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold gradient-text">Client Intake</h1>
                <p className="text-muted-foreground">
                    Onboard new SME clients. Financial institutions are automatically blocked.
                </p>
            </div>

            {/* Scope Notice */}
            <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Prisma Core Scope</AlertTitle>
                <AlertDescription className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">🇷🇼 Rwanda</Badge>
                    <Badge variant="outline">🇲🇹 Malta</Badge>
                    <Badge variant="outline">🇨🇦 Canada</Badge>
                    <span className="text-xs">• SMEs Only • No Financial Institutions</span>
                </AlertDescription>
            </Alert>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Client Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client / Entity Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Acme Trading Ltd"
                                                {...field}
                                                onBlur={() => performScreening()}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="jurisdiction"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Jurisdiction *</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {JURISDICTIONS.map(j => (
                                                        <SelectItem key={j.code} value={j.code}>
                                                            <span className="flex items-center gap-2">
                                                                <span>{j.flag}</span>
                                                                <span>{j.name}</span>
                                                                <span className="text-xs text-muted-foreground">({j.taxAuthority})</span>
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="segment"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client Segment *</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select segment" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {CLIENT_SEGMENTS.map(s => (
                                                        <SelectItem key={s.value} value={s.value}>
                                                            <span className="flex flex-col">
                                                                <span>{s.label}</span>
                                                                <span className="text-xs text-muted-foreground">{s.description}</span>
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="entityType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Entity Type *</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ENTITY_TYPES.map(t => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="contact@client.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="industryDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Industry / Business Activity *</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                rows={2}
                                                placeholder="Describe the client's main business activity..."
                                                {...field}
                                                onBlur={() => performScreening()}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            This is used to screen for financial institutions.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* FI Screening Result */}
                    {screening.performed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            {screening.result === 'ineligible' && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertTitle>Client Not Eligible</AlertTitle>
                                    <AlertDescription>
                                        <p>{screening.reason}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {screening.matchedKeywords.map(kw => (
                                                <Badge key={kw} variant="destructive">{kw}</Badge>
                                            ))}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {screening.result === 'warning' && (
                                <Alert className="border-amber-500 bg-amber-50 text-amber-900">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Review Required</AlertTitle>
                                    <AlertDescription>
                                        <p>{screening.reason}</p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {screening.matchedKeywords.map(kw => (
                                                <Badge key={kw} variant="outline" className="border-amber-500">{kw}</Badge>
                                            ))}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {screening.result === 'eligible' && (
                                <Alert className="border-emerald-500 bg-emerald-50 text-emerald-900">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertTitle>Eligible Client</AlertTitle>
                                    <AlertDescription>
                                        No financial institution indicators detected. Client can be onboarded.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </motion.div>
                    )}

                    {/* Tax Identifiers */}
                    {selectedJurisdiction && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    {selectedJurisdiction.flag} {selectedJurisdiction.name} Tax Details
                                </CardTitle>
                                <CardDescription>
                                    Tax authority: {selectedJurisdiction.taxAuthority} • Currency: {selectedJurisdiction.currency}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="taxId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tax ID / TIN</FormLabel>
                                            <FormControl>
                                                <Input placeholder={selectedJurisdiction.code === 'RW' ? 'RW-123456789' : 'Tax ID'} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="vatNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{selectedJurisdiction.code === 'CA' ? 'GST/HST Number' : 'VAT Number'}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={selectedJurisdiction.code === 'MT' ? 'MT12345678' : 'VAT #'} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset();
                                setScreening({ performed: false, result: null, reason: null, matchedKeywords: [] });
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            variant="gradient"
                            disabled={isSubmitting || screening.result === 'ineligible'}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Client'
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </motion.div>
    );
}

export default ClientIntake;
