import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Shield, Building2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            EPI-USE Africa
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Employee Hierarchy Management System
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
            Streamline your organization's structure with powerful employee management,
            visual hierarchy views, and comprehensive reporting capabilities.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-6"
          >
            Get Started
          </Button>
          <p className="text-sm text-muted-foreground mt-8">
            Created by Lesedi Mokoena
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <button
            onClick={() => navigate("/auth")}
            className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all hover:scale-105 text-left cursor-pointer"
          >
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Employee Management</h3>
            <p className="text-sm text-muted-foreground">
              Complete CRUD operations for employee records with validation and security
            </p>
          </button>

          <button
            onClick={() => navigate("/auth")}
            className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all hover:scale-105 text-left cursor-pointer"
          >
            <div className="p-3 rounded-lg bg-secondary/10 w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Visual Hierarchy</h3>
            <p className="text-sm text-muted-foreground">
              Interactive org chart with expandable nodes showing reporting structures
            </p>
          </button>

          <button
            onClick={() => navigate("/auth")}
            className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all hover:scale-105 text-left cursor-pointer"
          >
            <div className="p-3 rounded-lg bg-accent/10 w-fit mb-4">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Advanced Search</h3>
            <p className="text-sm text-muted-foreground">
              Filter and sort by any field with instant results and highlighting
            </p>
          </button>

          <button
            onClick={() => navigate("/auth")}
            className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all hover:scale-105 text-left cursor-pointer"
          >
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Cloud Hosted</h3>
            <p className="text-sm text-muted-foreground">
              Secure cloud deployment with real-time data synchronization
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
