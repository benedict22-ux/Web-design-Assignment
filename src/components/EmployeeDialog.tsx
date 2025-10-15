import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployeeCache } from "@/hooks/useEmployeeCache";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGravatarUrl } from "@/lib/gravatar";

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  birth_date: string;
  salary: number;
  role: string;
  manager_id: string | null;
}

interface EmployeeDialogProps {
  open: boolean;
  onClose: (shouldRefresh?: boolean) => void;
  employee: Employee | null;
}

const employeeSchema = z.object({
  employee_number: z.string().min(1, "Employee number is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  birth_date: z.string().min(1, "Birth date is required"),
  salary: z.number().min(0, "Salary must be positive"),
  role: z.string().min(1, "Role is required"),
});

const EmployeeDialog = ({ open, onClose, employee }: EmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    birth_date: "",
    salary: "",
    role: "",
    manager_id: "",
  });
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const { isOnline, addToLocalDB, updateInLocalDB, addPendingOperation } = useEmployeeCache();

  useEffect(() => {
    if (open) {
      fetchManagers();
      if (employee) {
        setFormData({
          employee_number: employee.employee_number,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email || "",
          birth_date: employee.birth_date,
          salary: employee.salary.toString(),
          role: employee.role,
          manager_id: employee.manager_id || "",
        });
      } else {
        setFormData({
          employee_number: "",
          first_name: "",
          last_name: "",
          email: "",
          birth_date: "",
          salary: "",
          role: "",
          manager_id: "",
        });
      }
    }
  }, [open, employee]);

  const fetchManagers = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("first_name");
    
    if (data) {
      setManagers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = employeeSchema.safeParse({
        ...formData,
        salary: parseFloat(formData.salary),
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const dataToSubmit = {
        employee_number: formData.employee_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        birth_date: formData.birth_date,
        salary: parseFloat(formData.salary),
        role: formData.role,
        manager_id: formData.manager_id || null,
      };

      if (employee) {
        // Update existing employee
        const updatedEmployee = { ...employee, ...dataToSubmit };
        
        if (isOnline) {
          const { error } = await supabase
            .from("employees")
            .update(dataToSubmit)
            .eq("id", employee.id);

          if (error) {
            if (error.message.includes("cannot be their own manager")) {
              toast.error("An employee cannot be their own manager");
            } else {
              toast.error("Failed to update employee");
            }
          } else {
            toast.success("Employee updated successfully");
            onClose(true);
          }
        } else {
          // Offline: update local DB and queue for sync
          await updateInLocalDB(updatedEmployee);
          await addPendingOperation('update', updatedEmployee);
          toast.success("Employee updated (will sync when online)");
          onClose(true);
        }
      } else {
        // Create new employee
        const newEmployee = {
          ...dataToSubmit,
          id: crypto.randomUUID(),
        };

        if (isOnline) {
          const { error } = await supabase
            .from("employees")
            .insert(dataToSubmit);

          if (error) {
            if (error.message.includes("duplicate key")) {
              toast.error("Employee number already exists");
            } else if (error.message.includes("cannot be their own manager")) {
              toast.error("An employee cannot be their own manager");
            } else {
              toast.error("Failed to create employee");
            }
          } else {
            toast.success("Employee created successfully");
            onClose(true);
          }
        } else {
          // Offline: add to local DB and queue for sync
          await addToLocalDB(newEmployee);
          await addPendingOperation('create', newEmployee);
          toast.success("Employee created (will sync when online)");
          onClose(true);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? "Update employee information"
              : "Enter employee details to add to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formData.email && (
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={getGravatarUrl(formData.email, 96)} 
                  alt="Profile preview" 
                />
                <AvatarFallback className="text-2xl">
                  {formData.first_name[0]}{formData.last_name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_number">Employee Number *</Label>
              <Input
                id="employee_number"
                value={formData.employee_number}
                onChange={(e) =>
                  setFormData({ ...formData, employee_number: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role/Position *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email (for Gravatar)</Label>
              <Input
                id="email"
                type="email"
                placeholder="employee@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Profile picture will be displayed via Gravatar if available
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date *</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) =>
                  setFormData({ ...formData, birth_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Salary (R) *</Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                min="0"
                value={formData.salary}
                onChange={(e) =>
                  setFormData({ ...formData, salary: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="manager_id">Reporting Line Manager</Label>
              <Select
                value={formData.manager_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, manager_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {managers
                    .filter((m) => !employee || m.id !== employee.id)
                    .map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name} ({manager.employee_number})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : employee ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDialog;
