import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import clientPromise from "./db";

export const auth = betterAuth({
  database: mongodbAdapter(clientPromise),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      studentId: { type: "string", required: false },
      phone: { type: "string", required: false },
      batch: { type: "string", required: false },
      semester: { type: "string", required: false },
      bloodGroup: { type: "string", required: false },
      address: { type: "string", required: false },
      teacherId: { type: "string", required: false },
      designation: { type: "string", required: false },
      specialization: { type: "string", required: false },
      officeRoom: { type: "string", required: false },
    }
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
