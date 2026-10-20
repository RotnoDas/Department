import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    jwtClient(),
  ],
});

/**
 * Authoritative, robust sign-out handler across all roles.
 * Invalidates session on the backend, purges client caches,
 * and forces a clean page transition directly to /login.
 */
export const safeSignOut = async (redirectTo = "/login") => {
  try {
    if (authClient?.signOut) {
      await authClient.signOut();
    }
  } catch (err) {
    console.warn("[safeSignOut] Remote sign out warning:", err);
  } finally {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.clear();
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_session");
        localStorage.removeItem("dept_user_session");
        localStorage.removeItem("dept_student_profile");
        // Clear any dept-specific caches
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("dept_")) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageErr) {
        console.warn("[safeSignOut] Storage clearing warning:", storageErr);
      }
      
      // Perform authoritative hard redirect to ensure zero stale in-memory React session
      window.location.href = redirectTo;
    }
  }
};

