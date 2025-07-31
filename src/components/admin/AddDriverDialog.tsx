import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddDriverDialogProps {
  onDriverAdded: () => void;
}

export function AddDriverDialog({ onDriverAdded }: AddDriverDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    driver_kind: "",
    vehicle_plate: "",
    momo_code: "",
    user_id: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('drivers')
        .insert([{
          driver_kind: formData.driver_kind as 'moto' | 'cab' | 'truck',
          vehicle_plate: formData.vehicle_plate,
          momo_code: formData.momo_code,
          user_id: formData.user_id || null,
          is_online: false,
          subscription_status: 'trial'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Driver created successfully",
      });

      setFormData({ driver_kind: "", vehicle_plate: "", momo_code: "", user_id: "" });
      setOpen(false);
      onDriverAdded();
    } catch (error: any) {
      console.error('Error creating driver:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create driver",
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
          Add Driver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driver_kind">Vehicle Type</Label>
            <Select
              value={formData.driver_kind}
              onValueChange={(value) => setFormData({ ...formData, driver_kind: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moto">Motorcycle</SelectItem>
                <SelectItem value="cab">Car/Taxi</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_plate">Vehicle Plate</Label>
            <Input
              id="vehicle_plate"
              placeholder="RAA 123 B"
              value={formData.vehicle_plate}
              onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
            />
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
            <Label htmlFor="user_id">User ID (Optional)</Label>
            <Input
              id="user_id"
              placeholder="User ID of the driver"
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
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
              {loading ? "Creating..." : "Create Driver"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}