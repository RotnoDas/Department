const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

// Helper to construct sample weekly routine across 8 semesters
const buildSampleRoutinesList = (teachersList = []) => {
  const sampleList = [];
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
  const morningSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 01:00"];
  const afternoonSlots = ["02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00"];
  
  const defaultTeachers = [
    { name: "Dr. Kamrul Hasan", id: "T-101" },
    { name: "Prof. M. A. Rahman", id: "T-102" },
    { name: "Dr. John Smith", id: "T-103" },
    { name: "Engr. Nusrat Sultana", id: "T-104" },
    { name: "Mr. Tanvir Ahmed", id: "T-105" },
    { name: "kao", id: "101" }
  ];

  const pool = teachersList.length > 0 
    ? teachersList.map(t => ({ name: t.name, id: t.teacherId || String(t._id) }))
    : defaultTeachers;

  for (let sem = 1; sem <= 8; sem++) {
    const courses = SEMESTER_COURSES[sem] || [];
    const theoryCourses = courses.filter(c => !c.title.toLowerCase().includes("sessional") && !c.title.toLowerCase().includes("viva"));
    const labCourses = courses.filter(c => c.title.toLowerCase().includes("sessional") || c.title.toLowerCase().includes("project"));

    days.forEach((day, dIdx) => {
      // Morning theory slots
      const theorySlots = morningSlots.slice(0, 3);
      theorySlots.forEach((slot, sIdx) => {
        if (theoryCourses.length > 0) {
          const course = theoryCourses[(dIdx * 2 + sIdx) % theoryCourses.length];
          const teacher = pool[(sem + dIdx + sIdx) % pool.length];
          sampleList.push({
            day,
            semester: sem,
            timeSlot: slot,
            courseCode: course.code,
            courseTitle: course.title,
            teacherId: teacher.id,
            teacherName: teacher.name,
            room: `Room ${400 + sem}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });

      // Afternoon practical/sessional slots on alternating days
      if ((dIdx === 1 || dIdx === 3) && labCourses.length > 0) {
        const labCourse = labCourses[(dIdx) % labCourses.length];
        const teacher = pool[(sem + dIdx) % pool.length];
        afternoonSlots.forEach((slot) => {
          sampleList.push({
            day,
            semester: sem,
            timeSlot: slot,
            courseCode: labCourse.code,
            courseTitle: labCourse.title,
            teacherId: teacher.id,
            teacherName: teacher.name,
            room: `Software Lab ${(sem % 2) + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      }
    });
  }
  return sampleList;
};

// Seed initial database items on startup if missing
const seedInitialData = async (collections) => {
  const { notices, courses, routines, teachers } = collections;

  // 1. Initial Notices
  const noticeCount = await notices.countDocuments();
  if (noticeCount === 0) {
    await notices.insertMany([
      {
        title: "Semester Final Examination Seating & Schedule",
        category: "Examination",
        audience: "All Students",
        content: "The 6th & 8th Semester Final Examinations are scheduled to commence from November 15, 2026. Detailed room seating will be posted on the portal.",
        priority: "High",
        date: "Oct 11, 2026",
        createdAt: new Date(),
      },
      {
        title: "Annual Department Programming Contest & Techfest 2026",
        category: "Events",
        audience: "All Members",
        content: "Registration for the Inter-University Programming Contest (IUPC) 2026 is now open. Interested teams should register by Oct 25.",
        priority: "Normal",
        date: "Oct 08, 2026",
        createdAt: new Date(),
      },
      {
        title: "Software & Hardware Lab Maintenance Schedule",
        category: "Infrastructure",
        audience: "Staff & Faculty",
        content: "Routine operating system and toolchain upgrade will be executed on Software Lab 1 workstations this weekend.",
        priority: "Normal",
        date: "Oct 05, 2026",
        createdAt: new Date(),
      }
    ]);
  }

  // 2. Initial Courses (Semesters 1 to 8)
  const courseCount = await courses.countDocuments();
  if (courseCount < 70) {
    for (const [semNum, list] of Object.entries(SEMESTER_COURSES)) {
      const semLabel = SEMESTER_LABELS[semNum] || `${semNum}th Semester`;
      for (const course of list) {
        await courses.updateOne(
          { code: course.code },
          {
            $set: {
              code: course.code,
              title: course.title,
              credits: Number(course.credits),
              semester: semLabel,
              semesterNum: Number(semNum),
              updatedAt: new Date(),
            },
            $setOnInsert: {
              faculty: "Dept Faculty Member",
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
      }
    }
    console.log('Seeded complete curriculum courses for Semesters 1 to 8 into MongoDB!');
  }

  // 3. Initial Routines
  const routineCount = await routines.countDocuments();
  if (routineCount === 0) {
    const teachersList = await teachers.find({}).toArray();
    const sampleRoutines = buildSampleRoutinesList(teachersList);
    if (sampleRoutines.length > 0) {
      await routines.insertMany(sampleRoutines);
      console.log(`Auto-seeded ${sampleRoutines.length} routine slots for Semesters 1 to 8 into MongoDB!`);
    }
  }
};

module.exports = {
  buildSampleRoutinesList,
  seedInitialData,
};
