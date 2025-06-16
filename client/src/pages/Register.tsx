import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
  });

  const onSubmit = async (data: InsertUser) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", data);
      toast({
        title: "Registration Successful",
        description: "Your account has been created and you are now logged in.",
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full space-y-8">
        <Card className="w-full shadow-lg border border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
              <p className="mt-2 text-sm text-slate-600">Sign up as a Normal User</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name (20-60 characters)"
                  {...register("name")}
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">Must be between 20-60 characters</p>
              </div>
              
              <div>
                <Label htmlFor="email">Email address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register("email")}
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  rows={3}
                  placeholder="Enter your address (max 400 characters)"
                  {...register("address")}
                  className="mt-1"
                />
                {errors.address && (
                  <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">Maximum 400 characters</p>
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password")}
                  className="mt-1"
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  8-16 characters, must include uppercase letter and special character
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
