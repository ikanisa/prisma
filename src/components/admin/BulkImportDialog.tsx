import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkImportDialogProps {
  onImportComplete: () => void;
}

export function BulkImportDialog({ onImportComplete }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    try {
      setImporting(true);

      // Call the import-contacts edge function
      const { data, error } = await supabase.functions.invoke('import-contacts');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Import completed. ${data?.imported || 0} new businesses added.`,
      });

      setOpen(false);
      onImportComplete();
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        title: "Error",
        description: "Failed to import contacts",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Upload className="h-4 w-4 mr-2" />
          Import from Contacts
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Businesses from Contacts</DialogTitle>
          <DialogDescription>
            This will scan your user contacts for potential businesses (bars, pharmacies, shops) 
            and create business entries for them. Only contacts not already registered as businesses will be imported.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : "Import Contacts"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}