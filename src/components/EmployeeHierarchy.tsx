import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGravatarUrl } from "@/lib/gravatar";

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  manager_id: string | null;
  subordinates?: Employee[];
}

const EmployeeHierarchy = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hierarchyTree, setHierarchyTree] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    buildHierarchyTree();
  }, [employees, searchTerm]);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("first_name");

    if (error) {
      toast.error("Failed to fetch employees");
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const buildHierarchyTree = () => {
    if (employees.length === 0) return;

    const employeeMap = new Map<string, Employee>();
    employees.forEach((emp) => {
      employeeMap.set(emp.id, { ...emp, subordinates: [] });
    });

    const roots: Employee[] = [];

    employees.forEach((emp) => {
      const employee = employeeMap.get(emp.id);
      if (!employee) return;

      if (emp.manager_id && employeeMap.has(emp.manager_id)) {
        const manager = employeeMap.get(emp.manager_id);
        manager?.subordinates?.push(employee);
      } else {
        roots.push(employee);
      }
    });

    if (searchTerm) {
      const filtered = filterHierarchy(roots, searchTerm.toLowerCase());
      setHierarchyTree(filtered);
    } else {
      setHierarchyTree(roots);
    }
  };

  const filterHierarchy = (nodes: Employee[], term: string): Employee[] => {
    return nodes
      .map((node) => {
        const matches =
          node.first_name.toLowerCase().includes(term) ||
          node.last_name.toLowerCase().includes(term) ||
          node.employee_number.toLowerCase().includes(term) ||
          node.role.toLowerCase().includes(term);

        const filteredSubordinates = node.subordinates
          ? filterHierarchy(node.subordinates, term)
          : [];

        if (matches || filteredSubordinates.length > 0) {
          return {
            ...node,
            subordinates: filteredSubordinates,
          };
        }
        return null;
      })
      .filter((node) => node !== null) as Employee[];
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const addAllIds = (nodes: Employee[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.subordinates && node.subordinates.length > 0) {
          addAllIds(node.subordinates);
        }
      });
    };
    addAllIds(hierarchyTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (employee: Employee, level: number = 0) => {
    const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;
    const isExpanded = expandedNodes.has(employee.id);

    return (
      <div key={employee.id} className="space-y-2">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
            level > 0 ? "ml-8" : ""
          }`}
          style={{ marginLeft: level > 0 ? `${level * 2}rem` : 0 }}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={getGravatarUrl(employee.email, 40)} 
              alt={`${employee.first_name} ${employee.last_name}`}
            />
            <AvatarFallback>
              {employee.first_name[0]}{employee.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold">
              {employee.first_name} {employee.last_name}
            </div>
            <div className="text-sm text-muted-foreground">
              {employee.role} • {employee.employee_number}
            </div>
          </div>
          {hasSubordinates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleNode(employee.id)}
            >
              {isExpanded ? "−" : "+"}
              <span className="ml-2 text-xs">
                {employee.subordinates?.length} report{employee.subordinates?.length !== 1 ? "s" : ""}
              </span>
            </Button>
          )}
        </div>

        {hasSubordinates && isExpanded && (
          <div className="space-y-2">
            {employee.subordinates?.map((sub) => renderNode(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Organization Hierarchy</CardTitle>
            <CardDescription>
              Visual representation of reporting structure
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hierarchy by name, employee number, or role..."
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
        ) : hierarchyTree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No employees found matching your search"
              : "No employees yet. Add employees to see the hierarchy."}
          </div>
        ) : (
          <div className="space-y-4">
            {hierarchyTree.map((employee) => renderNode(employee, 0))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeHierarchy;
