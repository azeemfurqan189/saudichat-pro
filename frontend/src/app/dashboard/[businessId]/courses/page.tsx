"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, UserPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Course, Enrollment } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function CoursesPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"courses" | "enrollments">("courses");
  const [courseForm, setCourseForm] = useState({ name: "", instructor: "", schedule: "", price: "", maxStudents: "" });
  const [enrollForm, setEnrollForm] = useState({ courseId: "", studentName: "", studentPhone: "" });

  const { data: courses = [] } = useQuery({ queryKey: ["courses", businessId], queryFn: async () => (await api.getCourses(businessId)).data ?? [] });
  const { data: enrollments = [] } = useQuery({ queryKey: ["enrollments", businessId], queryFn: async () => (await api.getEnrollments(businessId)).data ?? [] });
  const { data: stats } = useQuery({ queryKey: ["industry-stats", businessId], queryFn: async () => (await api.getIndustryStats(businessId)).data });

  const createCourse = useMutation({
    mutationFn: (d: Partial<Course>) => api.createCourse(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses", businessId] }); setCourseForm({ name: "", instructor: "", schedule: "", price: "", maxStudents: "" }); toast.success(isAr ? "تم" : "Course added"); },
  });
  const createEnroll = useMutation({
    mutationFn: (d: Partial<Enrollment>) => api.createEnrollment(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["enrollments", businessId] }); qc.invalidateQueries({ queryKey: ["courses", businessId] }); toast.success(isAr ? "تم التسجيل" : "Student enrolled"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "courses")}</h1>
        {stats && (
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-muted">{stats.totalCourses ?? 0} {isAr ? "دورات" : "Courses"}</span>
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30">{stats.enrolledStudents ?? 0} {isAr ? "طلاب" : "Students"}</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">{stats.activeCourses ?? 0} {isAr ? "نشطة" : "Active"}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(["courses", "enrollments"] as const).map((t_) => (
          <button key={t_} onClick={() => setTab(t_)} className={cn("px-4 py-2 rounded-xl text-sm font-medium", tab === t_ ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
            {t_ === "courses" ? (isAr ? "الدورات" : "Courses") : (isAr ? "التسجيلات" : "Enrollments")}
          </button>
        ))}
      </div>

      {tab === "courses" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <Input placeholder={isAr ? "اسم الدورة" : "Course name"} value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} />
            <Input placeholder={isAr ? "المدرب" : "Instructor"} value={courseForm.instructor} onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })} />
            <Input placeholder={isAr ? "الجدول" : "Schedule"} value={courseForm.schedule} onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })} />
            <Input placeholder={isAr ? "السعر" : "Price"} type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} />
            <Input placeholder={isAr ? "الحد الأقصى" : "Max students"} type="number" value={courseForm.maxStudents} onChange={(e) => setCourseForm({ ...courseForm, maxStudents: e.target.value })} />
            <Button onClick={() => courseForm.name && createCourse.mutate({ name: courseForm.name, instructor: courseForm.instructor, schedule: courseForm.schedule, price: courseForm.price ? Number(courseForm.price) : undefined, maxStudents: courseForm.maxStudents ? Number(courseForm.maxStudents) : undefined, status: "ACTIVE" })} loading={createCourse.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            {courses.map((c) => (
              <Card key={c.id} className="p-4 flex gap-3">
                <GraduationCap className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.instructor} · {c.schedule} · {c.enrolledCount}/{c.maxStudents ?? "∞"} · {c.price ? `${c.price} SAR` : ""}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "enrollments" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={enrollForm.courseId} onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}>
              <option value="">{isAr ? "الدورة" : "Course"}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder={isAr ? "اسم الطالب" : "Student name"} value={enrollForm.studentName} onChange={(e) => setEnrollForm({ ...enrollForm, studentName: e.target.value })} />
            <Input placeholder={isAr ? "الهاتف" : "Phone"} value={enrollForm.studentPhone} onChange={(e) => setEnrollForm({ ...enrollForm, studentPhone: e.target.value })} dir="ltr" />
            <Button onClick={() => enrollForm.courseId && enrollForm.studentName && createEnroll.mutate({ ...enrollForm, status: "ENROLLED" })} loading={createEnroll.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            {enrollments.map((e) => (
              <Card key={e.id} className="p-4 flex gap-3">
                <UserPlus className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{e.studentName}</p>
                  <p className="text-xs text-muted-foreground">{e.course?.name} · {e.studentPhone} · {e.status}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
