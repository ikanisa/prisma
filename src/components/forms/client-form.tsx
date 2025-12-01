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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/enhanced-button";
import { useToast } from "@/hooks/use-toast";
import { useOrganizations } from "@/hooks/use-organizations";
import { useCreateClient, useUpdateClient, type ClientRecord } from "@/hooks/use-clients";

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  industry: z.string().min(1, "Industry is required"),
  country: z.string().min(1, "Country is required"),
  fiscalYearEnd: z.string().min(1, "Fiscal year end is required"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientRecord | null;
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const { currentOrg } = useOrganizations();
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const loading = createClientMutation.isPending || updateClientMutation.isPending;
  const { toast } = useToast();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      industry: client?.industry || "",
      country: client?.country || "",
      fiscalYearEnd: client?.fiscalYearEnd || "",
      contactName: client?.contactName || "",
      contactEmail: client?.contactEmail || "",
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    if (!currentOrg?.id) {
      toast({
        variant: "destructive",
        title: "Select an organization",
        description: "Choose an organization before creating client records.",
      });
      return;
    }

    try {
      if (client) {
        await updateClientMutation.mutateAsync({
          id: client.id,
          orgId: currentOrg.id,
          updates: data,
        });
        toast({
          title: "Client updated",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await createClientMutation.mutateAsync({
          orgId: currentOrg.id,
          ...data,
        });
        toast({
          title: "Client created",
          description: `${data.name} has been added successfully.`,
        });
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "The agent could not save this client.";
      toast({
        variant: "destructive",
        title: "Unable to save client",
        description,
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
            {client ? "Edit Client" : "Add New Client"}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Technology, Healthcare" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalYearEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter contact email" {...field} />
                    </FormControl>
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
                  loading={loading}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {client ? "Update" : "Create"} Client
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
