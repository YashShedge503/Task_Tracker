import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import Layout from "@/components/Layout";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      // Redirect based on role
      switch (user.role) {
        case "admin":
          setLocation("/admin");
          break;
        case "store_owner":
          setLocation("/dashboard");
          break;
        case "normal":
          setLocation("/stores");
          break;
        default:
          // Stay on home if role is unclear
          break;
      }
    }
  }, [user, setLocation]);

  return (
    <Layout>
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Welcome to Store Rating Platform
        </h1>
        <p className="text-slate-600">
          Redirecting you to your dashboard...
        </p>
      </div>
    </Layout>
  );
}
