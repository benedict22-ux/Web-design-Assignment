import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmployeeCache } from "@/hooks/useEmployeeCache";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";
import EmployeeDialog from "./EmployeeDialog";
import { format } from "date-fns";
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
  manager?: {
    first_name: string;
    last_name: string;
  };
}

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sortField, setSortField] = useState<keyof Employee>("employee_number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { 
    saveToCache, 
    getFromCache, 
    isOnline,
    getPendingOperations,
    clearPendingOperations,
    addToLocalDB,
    updateInLocalDB,
    deleteFromLocalDB,
    addPendingOperation
  } = useEmployeeCache();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchEmployees();
    checkPendingOperations();
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingOperations();
    }
  }, [isOnline]);

  const checkPendingOperations = async () => {
    const pending = await getPendingOperations();
    setPendingCount(pending.length);
  };

  const syncPendingOperations = async () => {
    setSyncing(true);
    const pending = await getPendingOperations();
    
    if (pending.length === 0) {
      setSyncing(false);
      return;
    }

    toast.info(`Syncing ${pending.length} pending changes...`);

    for (const op of pending) {
      try {
        if (op.operation === 'create') {
          const { error } = await supabase.from("employees").insert(op.employee);
          if (error) throw error;
        } else if (op.operation === 'update') {
          const { error } = await supabase.from("employees").update(op.employee).eq("id", op.employee.id);
          if (error) throw error;
        } else if (op.operation === 'delete') {
          const { error } = await supabase.from("employees").delete().eq("id", op.employee.id);
          if (error) throw error;
        }
      } catch (error) {
        console.error('Sync error:', error);
        toast.error(`Failed to sync ${op.operation} operation`);
        setSyncing(false);
        return;
      }
    }

    await clearPendingOperations();
    setPendingCount(0);
    setSyncing(false);
    toast.success("All changes synced successfully!");
    fetchEmployees();
  };

  useEffect(() => {
    filterAndSortEmployees();
  }, [employees, searchTerm, sortField, sortDirection]);

  const fetchEmployees = async () => {
    setLoading(true);
    
    // Try to load from cache first
    const cachedData = await getFromCache();
    if (cachedData.length > 0) {
      setEmployees(cachedData);
      setLoading(false);
    }

    // If online, fetch from server and update cache
    if (isOnline) {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          *,
          manager:manager_id(first_name, last_name)
        `)
        .order("employee_number");

      if (error) {
        if (cachedData.length === 0) {
          toast.error("Failed to fetch employees");
        } else {
          toast.error("Using cached data - sync failed");
        }
      } else {
        setEmployees(data || []);
        await saveToCache(data || []);
      }
    } else if (cachedData.length === 0) {
      toast.error("No cached data available offline");
    } else {
      toast.info("Viewing cached data (offline mode)");
    }
    
    setLoading(false);
  };

  const filterAndSortEmployees = () => {
    let filtered = [...employees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.first_name.toLowerCase().includes(term) ||
          emp.last_name.toLowerCase().includes(term) ||
          emp.employee_number.toLowerCase().includes(term) ||
          emp.role.toLowerCase().includes(term) ||
          (emp.email && emp.email.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    setFilteredEmployees(filtered);
  };

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    if (isOnline) {
      const { error } = await supabase.from("employees").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete employee");
      } else {
        toast.success("Employee deleted successfully");
        fetchEmployees();
      }
    } else {
      // Offline: delete locally and queue for sync
      await deleteFromLocalDB(id);
      await addPendingOperation('delete', employee);
      await checkPendingOperations();
      toast.success("Employee deleted (will sync when online)");
      fetchEmployees();
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleDialogClose = async (shouldRefresh?: boolean) => {
    setDialogOpen(false);
    setSelectedEmployee(null);
    if (shouldRefresh) {
      await checkPendingOperations();
      fetchEmployees();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Employee Directory</CardTitle>
                {syncing && (
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Syncing...</span>
                  </div>
                )}
                {!syncing && !isOnline && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <WifiOff className="h-4 w-4" />
                    <span>Offline</span>
                    {pendingCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                )}
                {!syncing && isOnline && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Wifi className="h-4 w-4" />
                    <span>Online</span>
                  </div>
                )}
              </div>
              <CardDescription>
                Manage and search employee records
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee number, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No employees found matching your search" : "No employees yet"}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("employee_number")}>
                      Employee # {sortField === "employee_number" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("first_name")}>
                      Name {sortField === "first_name" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("role")}>
                      Role {sortField === "role" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("birth_date")}>
                      Birth Date {sortField === "birth_date" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("salary")}>
                      Salary {sortField === "salary" && (sortDirection === "asc" ? "↑" : "↓")}
                    </TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={getGravatarUrl(employee.email, 40)} alt={`${employee.first_name} ${employee.last_name}`} />
                          <AvatarFallback>{employee.first_name[0]}{employee.last_name[0]}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{employee.employee_number}</TableCell>
                      <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{employee.email || "—"}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{format(new Date(employee.birth_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>R {employee.salary.toLocaleString()}</TableCell>
                      <TableCell>
                        {employee.manager
                          ? `${employee.manager.first_name} ${employee.manager.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        employee={selectedEmployee}
      />
    </>
  );
};

export default EmployeeList;
