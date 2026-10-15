const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

// Helper to construct sample weekly routine across 8 semesters with ZERO room & teacher conflicts
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
    { name: "Dr. Farhana Yasmin", id: "T-106" },
    { name: "Dr. Tariqul Islam", id: "T-107" },
    { name: "Prof. Shamsul Alam", id: "T-108" },
    { name: "kao", id: "101" }
  ];

  // Distinct dedicated lab for each semester to eliminate any room overlap
  const semesterLabs = {
    1: "Software Lab 1",
    2: "Software Lab 2",
    3: "Digital Electronics Lab",
    4: "Hardware & Microprocessor Lab",
    5: "Network & Cyber Security Lab",
    6: "Software Lab 3",
    7: "AI & Data Science Lab",
    8: "Robotics & Embedded Systems Lab"
  };

  // Combine given teachers with defaultTeachers ensuring at least 8 unique teachers
  const mergedPool = [...teachersList];
  for (const dt of defaultTeachers) {
    if (!mergedPool.some(t => t.name === dt.name)) {
      mergedPool.push(dt);
    }
  }

  // Morning theory classes
  days.forEach((day, dIdx) => {
    const theorySlots = morningSlots.slice(0, 3);
    theorySlots.forEach((slot, sIdx) => {
      // For this slot across all 8 semesters, assign distinct theory classrooms (Room 401-408) & distinct teachers
      for (let sem = 1; sem <= 8; sem++) {
        const courses = SEMESTER_COURSES[sem] || [];
        const theoryCourses = courses.filter(c => !c.title.toLowerCase().includes("sessional") && !c.title.toLowerCase().includes("viva"));
        if (theoryCourses.length > 0) {
          const course = theoryCourses[(dIdx * 2 + sIdx + sem) % theoryCourses.length];
          // Teacher offset ensures unique instructor for each semester at this exact slot
          const teacher = mergedPool[(sem - 1 + dIdx * 3 + sIdx) % mergedPool.length];
          sampleList.push({
            day,
            semester: sem,
            timeSlot: slot,
            courseCode: course.code,
            courseTitle: course.title,
            teacherId: teacher.teacherId || teacher.id || String(teacher._id),
            teacherName: teacher.name,
            room: `Room ${400 + sem}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });

    // Afternoon practical/sessional classes (Staggered and using dedicated semester labs)
    for (let sem = 1; sem <= 8; sem++) {
      const courses = SEMESTER_COURSES[sem] || [];
      const labCourses = courses.filter(c => c.title.toLowerCase().includes("sessional") || c.title.toLowerCase().includes("project"));
      // Lab on alternating days specific to semester parity to balance the labs
      const isLabDay = (sem % 2 === 1 && (dIdx === 1 || dIdx === 3)) || (sem % 2 === 0 && (dIdx === 0 || dIdx === 2));
      if (isLabDay && labCourses.length > 0) {
        const labCourse = labCourses[dIdx % labCourses.length];
        const labTeacher = mergedPool[(sem + 3 + dIdx) % mergedPool.length];
        const labRoom = semesterLabs[sem] || `Software Lab ${sem}`;
        afternoonSlots.forEach((slot) => {
          sampleList.push({
            day,
            semester: sem,
            timeSlot: slot,
            courseCode: labCourse.code,
            courseTitle: labCourse.title,
            teacherId: labTeacher.teacherId || labTeacher.id || String(labTeacher._id),
            teacherName: labTeacher.name,
            room: labRoom,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      }
    }
  });

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
      console.log(`Auto-seeded ${sampleRoutines.length} conflict-free routine slots for Semesters 1 to 8 into MongoDB!`);
    }
  }
};

module.exports = {
  buildSampleRoutinesList,
  seedInitialData,
};
