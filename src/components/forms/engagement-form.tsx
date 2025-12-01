import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { X, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/enhanced-button";
import { useToast } from "@/hooks/use-toast";
import { useOrganizations } from "@/hooks/use-organizations";
import { useClients } from "@/hooks/use-clients";
import {
  useCreateEngagement,
  useUpdateEngagement,
  type EngagementRecord,
} from "@/hooks/use-engagements";

const engagementSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Engagement title is required"),
  type: z.enum(["ACCOUNTING", "AUDIT", "TAX"]),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  status: z.enum(["PLANNING", "IN_PROGRESS", "REVIEW", "COMPLETED"]),
  managerId: z.string().min(1, "Manager is required"),
});

type EngagementFormData = z.infer<typeof engagementSchema>;

interface EngagementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement?: EngagementRecord | null;
}

export function EngagementForm({ open, onOpenChange, engagement }: EngagementFormProps) {
  const { currentOrg, memberships } = useOrganizations();
  const orgId = currentOrg?.id ?? null;
  const { data: clients = [], isLoading: clientsLoading } = useClients(orgId ?? undefined);
  const createEngagementMutation = useCreateEngagement();
  const updateEngagementMutation = useUpdateEngagement();
  const isSaving = createEngagementMutation.isPending || updateEngagementMutation.isPending;
  const { toast } = useToast();

  const managerOptions = useMemo(() => {
    return memberships
      .filter((membership) =>
        ["MANAGER", "PARTNER", "SYSTEM_ADMIN"].includes(membership.role),
      )
      .map((membership) => ({
        id: membership.user_id,
        label: membership.role.replace("_", " "),
      }));
  }, [memberships]);

  const form = useForm<EngagementFormData>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      clientId: engagement?.clientId || "",
      title: engagement?.title || "",
      type: engagement?.type || "ACCOUNTING",
      periodStart: engagement?.periodStart || "",
      periodEnd: engagement?.periodEnd || "",
      status: engagement?.status || "PLANNING",
      managerId: engagement?.managerId || managerOptions[0]?.id || "",
    },
  });

  useEffect(() => {
    form.reset({
      clientId: engagement?.clientId || "",
      title: engagement?.title || "",
      type: engagement?.type || "ACCOUNTING",
      periodStart: engagement?.periodStart || "",
      periodEnd: engagement?.periodEnd || "",
      status: engagement?.status || "PLANNING",
      managerId: engagement?.managerId || managerOptions[0]?.id || "",
    });
  }, [engagement, managerOptions, form]);

  const onSubmit = async (data: EngagementFormData) => {
    if (!currentOrg?.id) {
      toast({
        variant: "destructive",
        title: "Select an organization",
        description: "Choose an organization before managing engagements.",
      });
      return;
    }

    try {
      if (engagement) {
        await updateEngagementMutation.mutateAsync({
          id: engagement.id,
          orgId: currentOrg.id,
          updates: data,
        });
        toast({
          title: "Engagement updated",
          description: "Engagement has been updated successfully.",
        });
      } else {
        await createEngagementMutation.mutateAsync({
          orgId: currentOrg.id,
          ...data,
        });
        toast({
          title: "Engagement created",
          description: "New engagement has been created successfully.",
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to save engagement",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass border-white/20 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="gradient-text">
            {engagement ? "Edit Engagement" : "Create New Engagement"}
          </SheetTitle>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={clientsLoading ? "Loading..." : "Select a client"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement title</FormLabel>
                    <FormControl>
                      <Input placeholder="FY24 Audit for Prisma Glow Retail" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select engagement type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACCOUNTING">Accounting</SelectItem>
                        <SelectItem value="AUDIT">Audit</SelectItem>
                        <SelectItem value="TAX">Tax</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manager</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {managerOptions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No managers available. Update memberships to assign roles.
                          </div>
                        ) : (
                          managerOptions.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLANNING">Planning</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="REVIEW">Review</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  loading={isSaving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {engagement ? "Update" : "Create"} Engagement
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
