"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setAuthenticated(true);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return <>{children}</>;
}
