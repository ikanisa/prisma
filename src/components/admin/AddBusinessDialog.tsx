import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddBusinessDialogProps {
  onBusinessAdded: () => void;
}

export function AddBusinessDialog({ onBusinessAdded }: AddBusinessDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    momo_code: "",
    owner_user_id: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('businesses')
        .insert([{
          name: formData.name,
          category: formData.category as 'bar' | 'pharmacy' | 'shop',
          momo_code: formData.momo_code,
          owner_user_id: formData.owner_user_id || null,
          subscription_status: 'trial'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business created successfully",
      });

      setFormData({ name: "", category: "", momo_code: "", owner_user_id: "" });
      setOpen(false);
      onBusinessAdded();
    } catch (error: any) {
      console.error('Error creating business:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create business",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Business
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Business</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              placeholder="Enter business name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="momo_code">MoMo Code</Label>
            <Input
              id="momo_code"
              placeholder="*182*7*1#"
              value={formData.momo_code}
              onChange={(e) => setFormData({ ...formData, momo_code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_user_id">Owner User ID (Optional)</Label>
            <Input
              id="owner_user_id"
              placeholder="User ID of the business owner"
              value={formData.owner_user_id}
              onChange={(e) => setFormData({ ...formData, owner_user_id: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Business"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}