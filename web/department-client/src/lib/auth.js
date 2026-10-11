import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { db, client } from "./db";

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "student", required: false },
      status: { type: "string", defaultValue: "pending", required: false },
      studentId: { type: "string", required: false },
      phone: { type: "string", required: false },
      batch: { type: "string", required: false },
      semester: { type: "string", required: false },
      session: { type: "string", required: false },
      bloodGroup: { type: "string", required: false },
      address: { type: "string", required: false },
      teacherId: { type: "string", required: false },
      designation: { type: "string", required: false },
      specialization: { type: "string", required: false },
      officeRoom: { type: "string", required: false },
      joiningDate: { type: "string", required: false },
      employeeId: { type: "string", required: false },
      department: { type: "string", required: false },
    },
  },
  plugins: [
    jwt(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          let role = "student";
          
          if (user.email.endsWith("@student.cse.edu")) {
            role = "student";
          } else if (user.email === "admin@cse.edu") {
            role = "admin";
          } else if (user.email.endsWith("@teacher.cse.edu") || (user.email.endsWith("@cse.edu") && !user.email.includes("staff"))) {
            role = "teacher";
          } else if (user.email.endsWith("@employee.cse.edu") || user.email.endsWith("@staff.cse.edu")) {
            role = "employee";
          }

          const status = role === "student" ? "pending" : "approved";

          return {
            data: {
              ...user,
              role: user.role || role,
              status: user.status || status,
            },
          };
        },
      },
    },
  },
});

