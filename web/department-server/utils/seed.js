const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

// Helper to construct weekly routine for Semesters 7 & 8 strictly distributed among registered teachers with ZERO room & teacher conflicts
const buildSampleRoutinesList = (teachersList = []) => {
  const sampleList = [];
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
  const morningSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00"];
  const afternoonSlots = ["02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00"];

  // Filter for approved registered teachers, fallback if none
  const activeTeachers = Array.isArray(teachersList) && teachersList.length > 0
    ? teachersList.filter(t => t.name && !t.name.includes("Faculty Department Instructor") && !t.name.includes("Dept Faculty Member"))
    : [];

  const registeredPool = activeTeachers.length > 0
    ? activeTeachers
    : (teachersList.length > 0 ? teachersList : [{ name: "Registered Faculty Member", teacherId: "T-REG" }]);

  const sem7Courses = (SEMESTER_COURSES[7] || []).filter(c => 
    !c.title.toLowerCase().includes("sessional") && 
    !c.title.toLowerCase().includes("viva") && 
    !c.title.toLowerCase().includes("thesis")
  );
  const sem8Courses = (SEMESTER_COURSES[8] || []).filter(c => 
    !c.title.toLowerCase().includes("sessional") && 
    !c.title.toLowerCase().includes("viva") && 
    !c.title.toLowerCase().includes("thesis")
  );

  const sem7Labs = (SEMESTER_COURSES[7] || []).filter(c => 
    c.title.toLowerCase().includes("sessional") || 
    c.title.toLowerCase().includes("project") || 
    c.title.toLowerCase().includes("thesis")
  );
  const sem8Labs = (SEMESTER_COURSES[8] || []).filter(c => 
    c.title.toLowerCase().includes("sessional") || 
    c.title.toLowerCase().includes("project") || 
    c.title.toLowerCase().includes("thesis")
  );

  let teacherCursor = 0;

  days.forEach((day, dIdx) => {
    // 3 morning theory slots per day
    morningSlots.forEach((slot, sIdx) => {
      const c7 = sem7Courses[(dIdx * 3 + sIdx) % sem7Courses.length];
      const c8 = sem8Courses[(dIdx * 3 + sIdx) % sem8Courses.length];

      // Assign distinct registered teachers to Sem 7 and Sem 8 to prevent any conflict
      const t7 = registeredPool[teacherCursor % registeredPool.length];
      const t8 = registeredPool[(teacherCursor + 1) % registeredPool.length];
      teacherCursor = (teacherCursor + 2) % registeredPool.length;

      sampleList.push({
        day,
        semester: 7,
        timeSlot: slot,
        courseCode: c7.code,
        courseTitle: c7.title,
        teacherId: t7.teacherId || t7.id || (t7._id ? String(t7._id) : null),
        teacherName: t7.name,
        room: "Room 407",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      sampleList.push({
        day,
        semester: 8,
        timeSlot: slot,
        courseCode: c8.code,
        courseTitle: c8.title,
        teacherId: t8.teacherId || t8.id || (t8._id ? String(t8._id) : null),
        teacherName: t8.name,
        room: "Room 408",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Afternoon lab sessions (3 hour blocks)
    // Sem 7 labs on Saturday, Monday, Wednesday
    // Sem 8 labs on Sunday, Tuesday, Wednesday
    const hasSem7Lab = (dIdx === 0 || dIdx === 2 || dIdx === 4);
    const hasSem8Lab = (dIdx === 1 || dIdx === 3 || dIdx === 4);

    let lab7Teacher = null;
    let lab8Teacher = null;

    if (hasSem7Lab && hasSem8Lab) {
      lab7Teacher = registeredPool[teacherCursor % registeredPool.length];
      lab8Teacher = registeredPool[(teacherCursor + 1) % registeredPool.length];
      teacherCursor = (teacherCursor + 2) % registeredPool.length;
    } else if (hasSem7Lab) {
      lab7Teacher = registeredPool[teacherCursor % registeredPool.length];
      teacherCursor = (teacherCursor + 1) % registeredPool.length;
    } else if (hasSem8Lab) {
      lab8Teacher = registeredPool[teacherCursor % registeredPool.length];
      teacherCursor = (teacherCursor + 1) % registeredPool.length;
    }

    if (hasSem7Lab) {
      const lab7 = sem7Labs[dIdx % sem7Labs.length];
      afternoonSlots.forEach(slot => {
        sampleList.push({
          day,
          semester: 7,
          timeSlot: slot,
          courseCode: lab7.code,
          courseTitle: lab7.title,
          teacherId: lab7Teacher.teacherId || lab7Teacher.id || (lab7Teacher._id ? String(lab7Teacher._id) : null),
          teacherName: lab7Teacher.name,
          room: "AI & Data Science Lab",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    }

    if (hasSem8Lab) {
      const lab8 = sem8Labs[dIdx % sem8Labs.length];
      afternoonSlots.forEach(slot => {
        sampleList.push({
          day,
          semester: 8,
          timeSlot: slot,
          courseCode: lab8.code,
          courseTitle: lab8.title,
          teacherId: lab8Teacher.teacherId || lab8Teacher.id || (lab8Teacher._id ? String(lab8Teacher._id) : null),
          teacherName: lab8Teacher.name,
          room: "Robotics & Embedded Systems Lab",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
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
