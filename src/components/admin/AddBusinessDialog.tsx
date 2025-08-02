import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddBusinessDialogProps {
  onBusinessAdded: () => void;
}

export function AddBusinessDialog({ onBusinessAdded }: AddBusinessDialogProps) {
  const [open, setOpen] = useState(false);

  const handleOpenDialog = () => {
    setOpen(true);
    // Placeholder function - would integrate with proper database when types are fixed
    setTimeout(() => {
      onBusinessAdded();
      setOpen(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Business</DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center text-muted-foreground">
          <p>Database connection required.</p>
          <p className="text-sm mt-2">Business creation will be enabled once Supabase types are properly generated.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}