import { redirect } from "next/navigation";

export default function TeacherCoursesIndexPage() {
  redirect("/dashboard/teacher#assigned-courses");
}
