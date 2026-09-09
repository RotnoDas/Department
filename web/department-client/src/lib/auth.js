import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import clientPromise from "./db";

export const auth = betterAuth({
  database: mongodbAdapter(clientPromise),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          let role = "student"; // Default
          
          if (user.email.endsWith("@student.cse.edu")) {
            role = "student";
          } else if (user.email.endsWith("@cse.edu")) {
            if (user.email === "admin@cse.edu") {
              role = "admin";
            } else {
              role = "teacher";
            }
          }

          return {
            data: {
              ...user,
              role,
            },
          };
        },
      },
    },
  },
});
