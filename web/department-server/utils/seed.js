const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

// Helper to construct weekly routine for all Semesters (1 to 8) distributed strictly among registered teachers with ZERO room & teacher conflicts
const buildSampleRoutinesList = (teachersList = []) => {
  const sampleList = [];
  const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
  const allSlots = [
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 01:00",
    "02:00 - 03:00",
    "03:00 - 04:00",
    "04:00 - 05:00"
  ];

  // Filter for approved registered teachers, fallback if none
  const activeTeachers = Array.isArray(teachersList) && teachersList.length > 0
    ? teachersList.filter(t => t.name && !t.name.includes("Faculty Department Instructor") && !t.name.includes("Dept Faculty Member"))
    : [];

  const registeredPool = activeTeachers.length > 0
    ? activeTeachers
    : (teachersList.length > 0 ? teachersList : [{ name: "Registered Faculty Member", teacherId: "T-REG" }]);

  const semRooms = {
    1: "Room 401",
    2: "Room 402",
    3: "Room 403",
    4: "Room 404",
    5: "Room 501",
    6: "Room 502",
    7: "Room 407",
    8: "Room 408"
  };

  const semLabRooms = {
    1: "Software Lab 1",
    2: "Hardware & Electronics Lab",
    3: "Mobile App & Web Lab",
    4: "Algorithms & Systems Lab",
    5: "Database & Compiler Lab",
    6: "Networks & Security Lab",
    7: "AI & Data Science Lab",
    8: "Robotics & Embedded Systems Lab"
  };

  // Pre-filter courses for each semester 1 to 8
  const semCoursesMap = {};
  for (let s = 1; s <= 8; s++) {
    const list = SEMESTER_COURSES[s] || [];
    const theory = list.filter(c => !c.title.toLowerCase().includes("sessional") && !c.title.toLowerCase().includes("viva") && !c.title.toLowerCase().includes("thesis"));
    const lab = list.filter(c => c.title.toLowerCase().includes("sessional") || c.title.toLowerCase().includes("project") || c.title.toLowerCase().includes("thesis"));
    semCoursesMap[s] = {
      theory: theory.length > 0 ? theory : list,
      lab: lab.length > 0 ? lab : theory
    };
  }

  const otherSemesters = [1, 2, 3, 4, 5, 6, 8];
  let otherOffset = 0;
  const coursePointers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

  // Map each registered faculty member to 2 distinct specific courses with ~4 slots per week
  // Faculty workload: realistic 2 courses per teacher, remainder assigned to "Dept Faculty Member"
  const teacherCourseAssignments = new Map();
  if (registeredPool.length > 0) {
    // Teacher 0 (e.g. Teacher A): CSE 4101 (Sem 7) and CSE 3101 (Sem 5)
    teacherCourseAssignments.set("7_CSE 4101", registeredPool[0]);
    teacherCourseAssignments.set("5_CSE 3101", registeredPool[0]);
  }
  if (registeredPool.length > 1) {
    // Teacher 1 (e.g. Teacher B): CSE 1101 (Sem 1) and CSE 3201 (Sem 6)
    teacherCourseAssignments.set("1_CSE 1101", registeredPool[1]);
    teacherCourseAssignments.set("6_CSE 3201", registeredPool[1]);
  }
  if (registeredPool.length > 2) {
    // Teacher 2 (e.g. Teacher C): CSE 2201 (Sem 4) and CSE 4201 (Sem 8)
    teacherCourseAssignments.set("4_CSE 2201", registeredPool[2]);
    teacherCourseAssignments.set("8_CSE 4201", registeredPool[2]);
  }

  const busyTeachersInSlot = new Set();

  days.forEach((day, dIdx) => {
    allSlots.forEach((slot, sIdx) => {
      const isAfternoon = sIdx >= 4; // Slots 02:00-03:00, 03:00-04:00, 04:00-05:00
      
      // Semester 7 is scheduled in every routine day slot along with 2 rotating conflict-free semesters
      const s1 = 7;
      const s2 = otherSemesters[(otherOffset) % otherSemesters.length];
      const s3 = otherSemesters[(otherOffset + 3) % otherSemesters.length];
      otherOffset++;

      const slotSemesters = [s1, s2, s3];
      slotSemesters.forEach((sem) => {
        const semData = semCoursesMap[sem];
        const isLab = isAfternoon && (dIdx % 2 === 0);
        const coursePool = isLab ? semData.lab : semData.theory;
        const cIdx = coursePointers[sem] % coursePool.length;
        const course = coursePool[cIdx];
        coursePointers[sem]++;

        const room = isLab ? semLabRooms[sem] : semRooms[sem];

        // Check if this specific course has an assigned faculty member
        let assignedFaculty = teacherCourseAssignments.get(`${sem}_${course.code}`);
        if (assignedFaculty) {
          const teacherKey = `${day}__${slot}__${assignedFaculty.name}`.toLowerCase();
          if (busyTeachersInSlot.has(teacherKey)) {
            assignedFaculty = null; // Do not double-book teacher across semesters in the same slot
          } else {
            busyTeachersInSlot.add(teacherKey);
          }
        }

        const teacherName = assignedFaculty ? assignedFaculty.name : "Dept Faculty Member";
        const teacherId = assignedFaculty ? (assignedFaculty.teacherId || assignedFaculty.id || (assignedFaculty._id ? String(assignedFaculty._id) : null)) : null;
        const teacherEmail = assignedFaculty ? (assignedFaculty.email || null) : null;

        sampleList.push({
          day,
          semester: sem,
          timeSlot: slot,
          courseCode: course.code,
          courseTitle: course.title,
          teacherId: teacherId,
          teacherName: teacherName,
          teacherEmail: teacherEmail,
          room: room,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });
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
