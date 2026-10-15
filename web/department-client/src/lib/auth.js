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
    minPasswordLength: 6,
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

          const status = (role === "student" || role === "teacher") ? "pending" : "approved";

          return {
            data: {
              ...user,
              role: user.role || role,
              status: user.status || status,
            },
          };
        },
        after: async (user) => {
          try {
            const role = user.role || "student";
            const now = new Date();
            const userId = (user.id || user._id)?.toString();

            if (role === "student") {
              const studentsCollection = db.collection("students");
              await studentsCollection.updateOne(
                { email: user.email },
                {
                  $set: {
                    userId,
                    name: user.name,
                    email: user.email,
                    studentId: user.studentId || "",
                    batch: user.batch ? (isNaN(Number(user.batch)) ? user.batch : Number(user.batch)) : "",
                    semester: user.semester || "",
                    session: user.session || "",
                    phone: user.phone || "",
                    bloodGroup: user.bloodGroup || "",
                    address: user.address || "",
                    cgpa: 0.0,
                    status: user.status || "pending",
                    updatedAt: now,
                  },
                  $setOnInsert: {
                    createdAt: now,
                  },
                },
                { upsert: true }
              );
            } else if (role === "teacher") {
              const teachersCollection = db.collection("teachers");
              await teachersCollection.updateOne(
                { email: user.email },
                {
                  $set: {
                    userId,
                    name: user.name,
                    email: user.email,
                    teacherId: user.teacherId || "",
                    phone: user.phone || "",
                    designation: user.designation || "",
                    specialization: user.specialization || "",
                    officeRoom: user.officeRoom || "",
                    joiningDate: user.joiningDate || "",
                    status: user.status || "pending",
                    updatedAt: now,
                  },
                  $setOnInsert: {
                    createdAt: now,
                  },
                },
                { upsert: true }
              );
            } else if (role === "employee") {
              const employeesCollection = db.collection("employees");
              await employeesCollection.updateOne(
                { email: user.email },
                {
                  $set: {
                    userId,
                    name: user.name,
                    email: user.email,
                    employeeId: user.employeeId || "",
                    phone: user.phone || "",
                    department: user.department || "",
                    designation: user.designation || "",
                    joiningDate: user.joiningDate || "",
                    status: user.status || "approved",
                    updatedAt: now,
                  },
                  $setOnInsert: {
                    createdAt: now,
                  },
                },
                { upsert: true }
              );
            } else if (role === "admin") {
              const adminsCollection = db.collection("admins");
              await adminsCollection.updateOne(
                { email: user.email },
                {
                  $set: {
                    userId,
                    name: user.name,
                    email: user.email,
                    role: "admin",
                    status: "approved",
                    updatedAt: now,
                  },
                  $setOnInsert: {
                    createdAt: now,
                  },
                },
                { upsert: true }
              );
            }
          } catch (hookError) {
            console.error("Error saving user to role collection in MongoDB:", hookError);
          }
        },
      },
    },
  },
});

