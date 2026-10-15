"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Loading from "@/components/common/Loading";

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
          const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
          fetch(`${serverUrl}/api/teachers/email/${email}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.status === "pending") {
                router.push(`/pending?email=${encodeURIComponent(email)}`);
              } else if (data?.status === "rejected") {
                router.push(`/rejected?email=${encodeURIComponent(email)}`);
              } else {
                router.push("/dashboard/teacher");
              }
            })
            .catch(() => {
              router.push("/dashboard/teacher");
            });
        } else if (role === "employee" || email.endsWith("@employee.cse.edu") || email.endsWith("@staff.cse.edu")) {
          router.push("/dashboard/employee");
        } else {
          const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
          fetch(`${serverUrl}/api/students/email/${email}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.status === "pending") {
                router.push("/pending");
              } else if (data?.status === "rejected") {
                router.push("/rejected");
              } else {
                router.push("/dashboard/student");
              }
            })
            .catch(() => {
              router.push("/dashboard/student");
            });
        }
      }
    }
  }, [sessionData, isPending, router]);

  return (
    <Loading 
      text="Directing to your workspace..." 
      subtext="Loading your role privileges and dashboard access" 
      fullScreen 
    />
  );
}
