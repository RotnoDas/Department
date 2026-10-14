"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GraduationCap } from "lucide-react";

export default function DashboardRedirect() {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending) {
      if (!sessionData?.user) {
        router.push("/login");
      } else {
        const role = sessionData.user.role;
        const email = (sessionData.user.email || "").toLowerCase().trim();
        if (role === "admin" || email === "admin@cse.edu" || email.includes("admin")) {
          router.push("/dashboard/admin");
        } else if (role === "teacher" || email.endsWith("@teacher.cse.edu") || (email.endsWith("@cse.edu") && !email.includes("student") && !email.includes("staff") && !email.includes("admin"))) {
          router.push("/dashboard/teacher");
        } else if (role === "employee" || email.endsWith("@employee.cse.edu") || email.endsWith("@staff.cse.edu")) {
          router.push("/dashboard/employee");
        } else {
          router.push("/dashboard/student");
        }
      }
    }
  }, [sessionData, isPending, router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 animate-bounce">
        <GraduationCap className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Directing to your workspace...</h2>
      <p className="text-sm font-medium text-slate-400">Loading your role privileges and dashboard</p>
    </div>
  );
}
