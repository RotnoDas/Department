'use strict';

const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

// Total degree credits across all 8 semesters (PUST CSE Ordinance)
function getTotalDegreeCredits() {
  let total = 0;
  for (let s = 1; s <= 8; s++) {
    const list = SEMESTER_COURSES[s] || [];
    list.forEach((c) => {
      total += Number(c.credits) || 0;
    });
  }
  return Number(total.toFixed(2));
}

const TOTAL_DEGREE_CREDITS = getTotalDegreeCredits(); // ~162.25

// Accurate PUST Academic Standing Category from GPA/CGPA
function getAcademicStandingCategory(gpa) {
  const val = Number(gpa) || 0;
  if (val >= 3.80) return "Dean's List / Highest Distinction (First Class with Honors)";
  if (val >= 3.75) return 'First Class with Honors (Outstanding)';
  if (val >= 3.00) return 'First Class (Excellent)';
  if (val >= 2.50) return 'Second Class (Upper Division)';
  if (val >= 2.25) return 'Second Class (Lower Division)';
  if (val >= 2.00) return 'Pass (Third Class)';
  return 'Academic Warning / Retake Required';
}

// Classify course as theory or sessional
function getCourseType(code, title) {
  const normTitle = String(title || '').toLowerCase();
  const normCode = String(code || '').toLowerCase();
  if (
    normTitle.includes('sessional') ||
    normTitle.includes('lab') ||
    normTitle.includes('project') ||
    normTitle.includes('drawing') ||
    normTitle.includes('thesis') ||
    normTitle.includes('viva')
  ) {
    return 'sessional';
  }
  // Even digits at end of CSE code (except 0/project/viva) are often sessional, but title is primary
  if (/00$|50$/.test(normCode)) return 'sessional';
  return 'theory';
}

// Attendance marks based on percentage (PUST Ordinance Sec 20.8 iv)
function calcAttendanceMarks(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 0) return 0;
  if (p >= 90) return 10;
  if (p >= 85) return 9;
  if (p >= 80) return 8;
  if (p >= 75) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  return 0;
}

/**
 * Computes exact mathematical credit trajectory and multi-dimensional ("multivisional")
 * breakdown across all 8 semesters.
 */
function calculateAcademicTrajectory(studentResults = [], currentSemester = 7) {
  const totalDegreeCredits = TOTAL_DEGREE_CREDITS;

  let completedCredits = 0;
  let completedEarnedCredits = 0;
  let completedGradePoints = 0;
  let theoryCredits = 0;
  let theoryGradePoints = 0;
  let sessionalCredits = 0;
  let sessionalGradePoints = 0;

  const gradeDistribution = {
    'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
  };

  const laggingCourses = [];
  const failedCourses = [];
  const allCoursesFlat = [];
  const attendanceIssues = [];
  let totalAttendanceMarksLost = 0;
  let totalAttendanceMarksEarned = 0;
  let totalAttendanceMarksPossible = 0;

  const semesterBreakdown = [];
  const sortedResults = [...studentResults].sort((a, b) => Number(a.semester) - Number(b.semester));

  let runningCredits = 0;
  let runningGradePoints = 0;
  let prevSgpa = null;
  let prevCgpa = null;

  sortedResults.forEach((sem) => {
    const semNum = Number(sem.semester);
    const semCourses = Array.isArray(sem.courses) ? sem.courses : [];
    const semCredits = Number(sem.totalCredits) || semCourses.reduce((s, c) => s + (Number(c.credits) || 0), 0);
    const semSgpa = Number(sem.sgpa) || 0;
    const semGradePoints = sem.totalGradePoints !== undefined
      ? Number(sem.totalGradePoints)
      : Number((semCredits * semSgpa).toFixed(2));

    completedCredits += semCredits;
    completedGradePoints += semGradePoints;
    runningCredits += semCredits;
    runningGradePoints += semGradePoints;

    const computedRunningCgpa = runningCredits > 0
      ? Number((runningGradePoints / runningCredits).toFixed(2))
      : semSgpa;
    const semCgpa = sem.cgpa !== undefined ? Number(sem.cgpa) : computedRunningCgpa;
    const semYgpa = sem.ygpa !== undefined ? Number(sem.ygpa) : semSgpa;

    let semEarnedCredits = 0;
    let semTheoryCredits = 0;
    let semTheoryPoints = 0;
    let semSessionalCredits = 0;
    let semSessionalPoints = 0;
    let semPassedCount = 0;
    let semFailedCount = 0;
    let semAttPctSum = 0;
    let semAttPctCount = 0;
    let semAttEarned = 0;
    let semAttMax = 0;
    let semCaEarned = 0;
    let semCaCount = 0;
    let semFinalEarned = 0;
    let semFinalCount = 0;

    const sanitizedSemCourses = [];

    semCourses.forEach((c) => {
      const cr = Number(c.credits) || 0;
      const gp = Number(c.gradePoint) || 0;
      const type = c.courseType || getCourseType(c.courseCode, c.courseTitle);
      const grade = String(c.grade || '').trim().toUpperCase();
      const marks = c.marks !== undefined && c.marks !== null && c.marks !== '' ? Number(c.marks) : null;
      const attPct = c.attendancePercentage !== undefined && c.attendancePercentage !== null && c.attendancePercentage !== ''
        ? Number(c.attendancePercentage)
        : null;
      const attMarks = c.attendanceMarks !== undefined && c.attendanceMarks !== null && c.attendanceMarks !== ''
        ? Number(c.attendanceMarks)
        : (attPct !== null ? calcAttendanceMarks(attPct) : null);
      const caMarks = c.caMarks !== undefined && c.caMarks !== null && c.caMarks !== ''
        ? Number(c.caMarks)
        : (c.continuousMarks !== undefined && c.continuousMarks !== null ? Number(c.continuousMarks) : null);
      const finalMarks = c.finalMarks !== undefined && c.finalMarks !== null && c.finalMarks !== ''
        ? Number(c.finalMarks)
        : null;

      const isPassed = grade !== 'F' && gp > 0;
      if (isPassed) {
        semEarnedCredits += cr;
        completedEarnedCredits += cr;
        semPassedCount++;
      } else {
        semFailedCount++;
      }

      if (gradeDistribution[grade] !== undefined) {
        gradeDistribution[grade]++;
      }

      if (type === 'sessional') {
        sessionalCredits += cr;
        sessionalGradePoints += cr * gp;
        semSessionalCredits += cr;
        semSessionalPoints += cr * gp;
      } else {
        theoryCredits += cr;
        theoryGradePoints += cr * gp;
        semTheoryCredits += cr;
        semTheoryPoints += cr * gp;
      }

      const courseObj = {
        semester: semNum,
        courseCode: String(c.courseCode || '').trim(),
        courseTitle: String(c.courseTitle || '').trim(),
        credits: cr,
        courseType: type,
        attendancePercentage: attPct,
        attendanceMarks: attMarks,
        caMarks,
        finalMarks,
        marks,
        grade,
        gradePoint: gp,
        creditPoints: Number((cr * gp).toFixed(2)),
        status: isPassed ? 'passed' : 'failed'
      };

      sanitizedSemCourses.push(courseObj);
      allCoursesFlat.push(courseObj);

      if (grade === 'F' || gp === 0) {
        failedCourses.push(courseObj);
      }

      if (gp < 3.00 || grade === 'F' || grade === 'D' || grade === 'C' || grade === 'C+') {
        laggingCourses.push({
          semester: semNum,
          courseCode: courseObj.courseCode,
          courseTitle: courseObj.courseTitle,
          credits: cr,
          grade,
          gradePoint: gp,
          marks,
          type
        });
      }

      if (attPct !== null && !isNaN(attPct)) {
        semAttPctSum += attPct;
        semAttPctCount++;
      }
      if (attMarks !== null && !isNaN(attMarks)) {
        const lost = Math.max(0, 10 - attMarks);
        semAttEarned += attMarks;
        semAttMax += 10;
        totalAttendanceMarksEarned += attMarks;
        totalAttendanceMarksPossible += 10;
        if (lost > 0) {
          totalAttendanceMarksLost += lost;
          if ((attPct !== null && attPct < 85) || attMarks <= 7) {
            attendanceIssues.push({
              semester: semNum,
              courseCode: courseObj.courseCode,
              courseTitle: courseObj.courseTitle,
              attendancePercentage: attPct,
              marksEarned: attMarks,
              marksLost: lost
            });
          }
        }
      }

      if (caMarks !== null && !isNaN(caMarks)) {
        semCaEarned += caMarks;
        semCaCount++;
      }
      if (finalMarks !== null && !isNaN(finalMarks)) {
        semFinalEarned += finalMarks;
        semFinalCount++;
      }
    });

    const semTheoryGpa = semTheoryCredits > 0 ? Number((semTheoryPoints / semTheoryCredits).toFixed(2)) : 0;
    const semSessionalGpa = semSessionalCredits > 0 ? Number((semSessionalPoints / semSessionalCredits).toFixed(2)) : 0;
    const avgAttendance = semAttPctCount > 0 ? Number((semAttPctSum / semAttPctCount).toFixed(1)) : null;

    const sortedByScoreDesc = [...sanitizedSemCourses].sort((a, b) => {
      if ((b.marks ?? -1) !== (a.marks ?? -1)) return (b.marks ?? -1) - (a.marks ?? -1);
      return b.gradePoint - a.gradePoint;
    });
    const sortedByScoreAsc = [...sanitizedSemCourses].sort((a, b) => {
      if ((a.marks ?? 999) !== (b.marks ?? 999)) return (a.marks ?? 999) - (b.marks ?? 999);
      return a.gradePoint - b.gradePoint;
    });

    const deltaSgpa = prevSgpa !== null ? Number((semSgpa - prevSgpa).toFixed(2)) : null;
    const deltaCgpa = prevCgpa !== null ? Number((semCgpa - prevCgpa).toFixed(2)) : null;
    prevSgpa = semSgpa;
    prevCgpa = semCgpa;

    semesterBreakdown.push({
      semester: semNum,
      label: sem.semesterLabel || SEMESTER_LABELS[semNum] || `Semester ${semNum}`,
      session: sem.session || '2022-2023',
      examYear: sem.examYear || (2020 + semNum),
      credits: Number(semCredits.toFixed(2)),
      earnedCredits: Number((sem.earnedCredits !== undefined ? Number(sem.earnedCredits) : semEarnedCredits).toFixed(2)),
      sgpa: semSgpa,
      sgpaExact: sem.sgpaExact || semSgpa,
      ygpa: semYgpa,
      academicYear: sem.academicYear || Math.ceil(semNum / 2),
      cgpa: semCgpa,
      academicStanding: sem.academicStanding || getAcademicStandingCategory(semCgpa),
      isDeansList: Boolean(sem.isDeansList || semCgpa >= 3.80),
      gradePoints: semGradePoints,
      coursesCount: sanitizedSemCourses.length,
      passedCount: semPassedCount,
      failedCount: semFailedCount,
      theoryCredits: Number(semTheoryCredits.toFixed(2)),
      theoryGpa: semTheoryGpa,
      sessionalCredits: Number(semSessionalCredits.toFixed(2)),
      sessionalGpa: semSessionalGpa,
      avgAttendance,
      attMarksEarned: semAttEarned,
      attMarksMax: semAttMax,
      attMarksLost: Math.max(0, semAttMax - semAttEarned),
      avgCaMarks: semCaCount > 0 ? Number((semCaEarned / semCaCount).toFixed(1)) : null,
      avgFinalMarks: semFinalCount > 0 ? Number((semFinalEarned / semFinalCount).toFixed(1)) : null,
      topCourses: sortedByScoreDesc.slice(0, 3),
      weakestCourses: sortedByScoreAsc.slice(0, 3),
      failedCourses: sanitizedSemCourses.filter((c) => c.status === 'failed'),
      deltaSgpa,
      deltaCgpa,
      courses: sanitizedSemCourses
    });
  });

  const currentCGPA = completedCredits > 0
    ? Number((completedGradePoints / completedCredits).toFixed(2))
    : 0.00;

  const theoryGpa = theoryCredits > 0
    ? Number((theoryGradePoints / theoryCredits).toFixed(2))
    : 0.00;

  const sessionalGpa = sessionalCredits > 0
    ? Number((sessionalGradePoints / sessionalCredits).toFixed(2))
    : 0.00;

  const remainingCredits = Math.max(0, Number((totalDegreeCredits - completedCredits).toFixed(2)));
  const completedSemestersCount = semesterBreakdown.length;
  const publishedSemNums = new Set(semesterBreakdown.map((s) => s.semester));

  const remainingSemesters = [];
  for (let s = 1; s <= 8; s++) {
    if (!publishedSemNums.has(s)) {
      const courses = SEMESTER_COURSES[s] || [];
      const credits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
      remainingSemesters.push({
        semester: s,
        label: SEMESTER_LABELS[s] || `Semester ${s}`,
        credits: Number(credits.toFixed(2)),
        coursesCount: courses.length,
        courses: courses.map((c) => ({
          code: c.code,
          title: c.title,
          credits: c.credits,
          type: getCourseType(c.code, c.title)
        }))
      });
    }
  }
  const remainingSemestersCount = remainingSemesters.length;

  const maxAchievableCGPA = remainingCredits > 0
    ? Number(((completedGradePoints + (remainingCredits * 4.00)) / totalDegreeCredits).toFixed(2))
    : currentCGPA;

  const minAchievableCGPA = remainingCredits > 0
    ? Number(((completedGradePoints + (remainingCredits * 2.00)) / totalDegreeCredits).toFixed(2))
    : currentCGPA;

  const latestSem = semesterBreakdown[semesterBreakdown.length - 1];
  const latestSgpa = latestSem ? latestSem.sgpa : currentCGPA;
  const projectedFutureSgpa = Math.min(4.00, Math.max(2.00, Number((0.60 * currentCGPA + 0.40 * latestSgpa).toFixed(2))));
  const projectedFinalCGPA = remainingCredits > 0
    ? Number(((completedGradePoints + (remainingCredits * projectedFutureSgpa)) / totalDegreeCredits).toFixed(2))
    : currentCGPA;

  function calcRequiredSgpa(targetCgpa) {
    if (remainingCredits <= 0) return null;
    const needed = (targetCgpa * totalDegreeCredits - completedGradePoints) / remainingCredits;
    return Number(needed.toFixed(2));
  }

  const reqSgpaDeansList = calcRequiredSgpa(3.80);
  const reqSgpaHonors = calcRequiredSgpa(3.75);
  const reqSgpaFirstClass = calcRequiredSgpa(3.00);
  const reqSgpaUpperSecond = calcRequiredSgpa(2.50);

  const bestSemester = semesterBreakdown.length > 0
    ? [...semesterBreakdown].sort((a, b) => b.sgpa - a.sgpa)[0]
    : null;
  const lowestSemester = semesterBreakdown.length > 0
    ? [...semesterBreakdown].sort((a, b) => a.sgpa - b.sgpa)[0]
    : null;

  const topCoursesOverall = [...allCoursesFlat]
    .sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0))
    .slice(0, 5);

  return {
    totalDegreeCredits,
    completedCredits: Number(completedCredits.toFixed(2)),
    completedEarnedCredits: Number(completedEarnedCredits.toFixed(2)),
    completedGradePoints: Number(completedGradePoints.toFixed(2)),
    remainingCredits,
    completedSemestersCount,
    remainingSemestersCount,
    currentCGPA,
    currentStanding: getAcademicStandingCategory(currentCGPA),
    theoryGpa,
    theoryCredits: Number(theoryCredits.toFixed(2)),
    sessionalGpa,
    sessionalCredits: Number(sessionalCredits.toFixed(2)),
    gradeDistribution,
    laggingCourses,
    failedCourses,
    topCoursesOverall,
    allCoursesFlat,
    bestSemester: bestSemester ? { semester: bestSemester.semester, label: bestSemester.label, sgpa: bestSemester.sgpa } : null,
    lowestSemester: lowestSemester ? { semester: lowestSemester.semester, label: lowestSemester.label, sgpa: lowestSemester.sgpa } : null,
    attendanceIssues,
    totalAttendanceMarksLost,
    totalAttendanceMarksEarned,
    totalAttendanceMarksPossible,
    semesterBreakdown,
    remainingSemesters,
    maxAchievableCGPA,
    minAchievableCGPA,
    projectedFutureSgpa,
    projectedFinalCGPA,
    projectedStanding: getAcademicStandingCategory(projectedFinalCGPA),
    requiredSgpas: {
      deansList_3_80: {
        target: 3.80,
        label: "Dean's List / Highest Honors",
        requiredSgpa: reqSgpaDeansList,
        isPossible: reqSgpaDeansList !== null ? reqSgpaDeansList <= 4.00 : currentCGPA >= 3.80,
        alreadyAchieved: currentCGPA >= 3.80 && remainingCredits === 0
      },
      honors_3_75: {
        target: 3.75,
        label: 'First Class with Honors',
        requiredSgpa: reqSgpaHonors,
        isPossible: reqSgpaHonors !== null ? reqSgpaHonors <= 4.00 : currentCGPA >= 3.75,
        alreadyAchieved: currentCGPA >= 3.75 && remainingCredits === 0
      },
      firstClass_3_00: {
        target: 3.00,
        label: 'First Class',
        requiredSgpa: reqSgpaFirstClass,
        isPossible: reqSgpaFirstClass !== null ? reqSgpaFirstClass <= 4.00 : currentCGPA >= 3.00,
        alreadyAchieved: currentCGPA >= 3.00 && remainingCredits === 0
      },
      upperSecond_2_50: {
        target: 2.50,
        label: 'Second Class (Upper Division)',
        requiredSgpa: reqSgpaUpperSecond,
        isPossible: reqSgpaUpperSecond !== null ? reqSgpaUpperSecond <= 4.00 : currentCGPA >= 2.50,
        alreadyAchieved: currentCGPA >= 2.50 && remainingCredits === 0
      }
    }
  };
}

/**
 * Fetches live website data across MongoDB collections so the AI Chatbot
 * learns about all platform data (batch rankings, live attendance, routine,
 * assignments, class tests, study materials, notices, teachers).
 */
async function fetchWebsiteLearningContext(collections, student, currentSemNum = 7) {
  if (!collections || !student) return {};

  const studentEmail = String(student.email || '').trim().toLowerCase();
  const studentId = String(student.studentId || '').trim();
  const userId = student.userId ? String(student.userId) : String(student._id || '');
  const semVariants = [
    currentSemNum,
    String(currentSemNum),
    `${currentSemNum}th`,
    `${currentSemNum}st`,
    `${currentSemNum}nd`,
    `${currentSemNum}rd`,
    `Semester ${currentSemNum}`
  ];

  const currentSemCourses = (SEMESTER_COURSES[currentSemNum] || []).map((c) => c.code);

  try {
    const [
      allPublishedResults,
      routineDocs,
      attSessions,
      attRecords,
      assignmentDocs,
      submissionDocs,
      classTestDocs,
      materialDocs,
      studyNoteDocs,
      noticeDocs,
      teacherDocs
    ] = await Promise.all([
      collections.results
        ? collections.results.find({ status: 'published' }).project({ studentId: 1, studentName: 1, semester: 1, sgpa: 1, cgpa: 1 }).toArray().catch(() => [])
        : [],
      collections.routines
        ? collections.routines.find({ semester: { $in: semVariants } }).toArray().catch(() => [])
        : [],
      collections.attendanceSessions
        ? collections.attendanceSessions.find({
            $or: [
              { semester: { $in: semVariants } },
              { courseCode: { $in: currentSemCourses } }
            ]
          }).sort({ sessionDate: -1 }).limit(100).toArray().catch(() => [])
        : [],
      collections.attendanceRecords
        ? collections.attendanceRecords.find({
            $or: [
              { studentEmail: { $in: [studentEmail, student.email] } },
              ...(studentId ? [{ studentId }] : []),
              ...(userId ? [{ userId }] : [])
            ]
          }).sort({ markedAt: -1 }).limit(200).toArray().catch(() => [])
        : [],
      collections.assignments
        ? collections.assignments.find({
            $or: [
              { semester: { $in: semVariants } },
              { courseCode: { $in: currentSemCourses } }
            ]
          }).sort({ createdAt: -1 }).limit(30).toArray().catch(() => [])
        : [],
      collections.assignmentSubmissions
        ? collections.assignmentSubmissions.find({
            $or: [
              { studentEmail: { $in: [studentEmail, student.email] } },
              ...(studentId ? [{ studentId }] : [])
            ]
          }).toArray().catch(() => [])
        : [],
      collections.classTests
        ? collections.classTests.find({
            $or: [
              { semester: { $in: semVariants } },
              { courseCode: { $in: currentSemCourses } }
            ]
          }).sort({ createdAt: -1 }).limit(30).toArray().catch(() => [])
        : [],
      collections.materials
        ? collections.materials.find({
            $or: [
              { semester: { $in: semVariants } },
              { courseCode: { $in: currentSemCourses } }
            ]
          }).sort({ createdAt: -1 }).limit(30).toArray().catch(() => [])
        : [],
      collections.studyNotes
        ? collections.studyNotes.find({
            studentEmail: { $in: [studentEmail, student.email] }
          }).sort({ createdAt: -1 }).limit(15).toArray().catch(() => [])
        : [],
      collections.notices
        ? collections.notices.find({}).sort({ createdAt: -1 }).limit(12).toArray().catch(() => [])
        : [],
      collections.teachers
        ? collections.teachers.find({}).project({ name: 1, designation: 1, email: 1, phone: 1, office: 1, officeRoom: 1, specialization: 1, assignedCourses: 1 }).toArray().catch(() => [])
        : []
    ]);

    // 1. Batch & Semester Cohort Ranking Analysis
    const semesterCohortStats = {};
    for (let s = 1; s <= 8; s++) {
      const semRows = allPublishedResults.filter((r) => Number(r.semester) === s && Number.isFinite(Number(r.sgpa)));
      if (semRows.length > 0) {
        semRows.sort((a, b) => Number(b.sgpa) - Number(a.sgpa));
        const avgSgpa = Number((semRows.reduce((acc, r) => acc + Number(r.sgpa), 0) / semRows.length).toFixed(2));
        const highestSgpa = Number(semRows[0].sgpa);
        const lowestSgpa = Number(semRows[semRows.length - 1].sgpa);
        const myIndex = semRows.findIndex((r) => String(r.studentId).trim() === studentId);
        const myRank = myIndex >= 0 ? myIndex + 1 : null;
        const percentile = myRank !== null && semRows.length > 1
          ? Math.round(((semRows.length - myRank) / (semRows.length - 1)) * 100)
          : 100;
        semesterCohortStats[s] = {
          totalStudents: semRows.length,
          avgSgpa,
          highestSgpa,
          lowestSgpa,
          myRank,
          percentile
        };
      }
    }

    // 2. Live Attendance Summary per Course
    const attendedSessionIds = new Set(attRecords.map((r) => String(r.sessionId || r.sessionKey || '')));
    const courseAttMap = {};
    currentSemCourses.forEach((code) => {
      courseAttMap[code] = { courseCode: code, totalSessions: 0, attendedSessions: 0 };
    });

    attSessions.forEach((sess) => {
      const code = String(sess.courseCode || '').trim().toUpperCase();
      if (!code) return;
      if (!courseAttMap[code]) {
        courseAttMap[code] = { courseCode: code, totalSessions: 0, attendedSessions: 0 };
      }
      courseAttMap[code].totalSessions++;
      const sId = String(sess._id || '');
      const sKey = String(sess.sessionKey || '');
      if (attendedSessionIds.has(sId) || (sKey && attendedSessionIds.has(sKey))) {
        courseAttMap[code].attendedSessions++;
      }
    });

    // Also count direct attendance records if any weren't matched by session doc
    attRecords.forEach((rec) => {
      const code = String(rec.courseCode || '').trim().toUpperCase();
      if (code && courseAttMap[code] && courseAttMap[code].totalSessions === 0) {
        courseAttMap[code].totalSessions = Math.max(1, courseAttMap[code].totalSessions);
        courseAttMap[code].attendedSessions++;
      }
    });

    const liveAttendance = Object.values(courseAttMap).map((item) => {
      const pct = item.totalSessions > 0
        ? Math.min(100, Math.round((item.attendedSessions / item.totalSessions) * 100))
        : null;
      return {
        ...item,
        percentage: pct,
        estimatedMarks: pct !== null ? calcAttendanceMarks(pct) : null
      };
    });

    // 3. Assignments Summary
    const subByAssignmentId = new Map();
    submissionDocs.forEach((sub) => {
      subByAssignmentId.set(String(sub.assignmentId || ''), sub);
    });

    const assignmentsSummary = assignmentDocs.map((a) => {
      const sub = subByAssignmentId.get(String(a._id));
      return {
        id: String(a._id),
        title: a.title || 'Course Assignment',
        courseCode: a.courseCode,
        dueDate: a.dueDate || a.deadline,
        totalMarks: a.totalMarks || a.maxMarks || 10,
        submitted: Boolean(sub),
        status: sub ? (sub.status || (sub.marks !== undefined && sub.marks !== null ? 'graded' : 'submitted')) : 'pending',
        obtainedMarks: sub?.marks ?? sub?.obtainedMarks ?? null,
        feedback: sub?.feedback || null
      };
    });

    // 4. Class Tests Summary
    const classTestsSummary = classTestDocs.map((ct) => {
      let myMark = null;
      if (Array.isArray(ct.marks)) {
        const found = ct.marks.find(
          (m) =>
            String(m.studentId || '').trim() === studentId ||
            String(m.studentEmail || '').trim().toLowerCase() === studentEmail
        );
        if (found) myMark = found.marks ?? found.obtainedMarks ?? found.score ?? null;
      }
      return {
        title: ct.title || ct.testName || `CT ${ct.testNumber || 1}`,
        courseCode: ct.courseCode,
        maxMarks: ct.maxMarks || ct.totalMarks || 20,
        obtainedMarks: myMark,
        date: ct.date || ct.testDate || ct.createdAt
      };
    });

    // 5. Routine Summary
    const routineSummary = routineDocs.map((r) => ({
      day: r.day,
      timeSlot: r.timeSlot,
      courseCode: r.courseCode,
      courseTitle: r.courseTitle,
      teacherName: r.teacherName || r.teacher,
      room: r.room || r.roomNumber
    }));

    // 6. Materials & Study Notes Summary
    const materialsSummary = materialDocs.map((m) => ({
      title: m.title || m.fileName || 'Course Material',
      courseCode: m.courseCode,
      type: m.type || m.category || 'Lecture Note',
      uploadedBy: m.teacherName || m.uploadedBy || 'Faculty'
    }));

    const studyNotesSummary = studyNoteDocs.map((n) => ({
      title: n.title || n.topic || 'AI Study Note',
      courseCode: n.courseCode,
      quizScore: n.quizScore ?? null
    }));

    // 7. Notices Summary
    const noticesSummary = noticeDocs.map((n) => ({
      title: n.title,
      category: n.category || (n.courseCode ? 'Course Notice' : 'Official Notice'),
      courseCode: n.courseCode || null,
      authorName: n.authorName || n.postedBy || 'CSE Administration',
      date: n.createdAt || n.date,
      hasAudio: Boolean(n.audioUrl),
      summary: String(n.content || n.description || '').slice(0, 140)
    }));

    // 8. Teachers Summary
    const teachersSummary = teacherDocs.map((t) => ({
      name: t.name,
      designation: t.designation || 'Faculty Member',
      email: t.email,
      phone: t.phone || 'N/A',
      office: t.office || t.officeRoom || 'CSE Building',
      specialization: t.specialization || 'Computer Science & Engineering',
      courses: Array.isArray(t.assignedCourses)
        ? t.assignedCourses.map((c) => (typeof c === 'string' ? c : c.code || c.courseCode)).filter(Boolean)
        : []
    }));

    return {
      semesterCohortStats,
      liveAttendance,
      totalAttendanceCheckIns: attRecords.length,
      assignmentsSummary,
      classTestsSummary,
      routineSummary,
      materialsSummary,
      studyNotesSummary,
      noticesSummary,
      teachersSummary
    };
  } catch (err) {
    console.warn('[AI Advisor] Error building website context:', err.message);
    return {};
  }
}

/**
 * Generates rule-based expert diagnosis (used as baseline and fallback)
 */
function generateRuleBasedAdvisor(student, trajectory) {
  const {
    currentCGPA,
    projectedFinalCGPA,
    theoryGpa,
    sessionalGpa,
    laggingCourses,
    failedCourses,
    totalAttendanceMarksLost,
    requiredSgpas,
    remainingSemesters
  } = trajectory;

  const standingCategory = getAcademicStandingCategory(projectedFinalCGPA);

  const strengths = [];
  if (sessionalGpa >= 3.50) {
    strengths.push(`Strong practical lab execution with a Sessional GPA of ${sessionalGpa.toFixed(2)} / 4.00.`);
  } else if (sessionalGpa > theoryGpa) {
    strengths.push(`Practical sessional coursework (${sessionalGpa.toFixed(2)} GPA) outperforms written theory papers (${theoryGpa.toFixed(2)} GPA).`);
  }
  if (trajectory.bestSemester) {
    strengths.push(`Peak academic performance achieved in Semester ${trajectory.bestSemester.semester} with an SGPA of ${trajectory.bestSemester.sgpa.toFixed(2)}.`);
  }
  if (trajectory.gradeDistribution['A+'] + trajectory.gradeDistribution['A'] > 0) {
    strengths.push(`Secured ${trajectory.gradeDistribution['A+']} A+ and ${trajectory.gradeDistribution['A']} A grades across completed courses.`);
  }
  if (strengths.length === 0) {
    strengths.push(`Completed ${trajectory.completedEarnedCredits} of ${trajectory.totalDegreeCredits} degree credits across ${trajectory.completedSemestersCount} published semesters.`);
  }

  const weaknesses = [];
  if (failedCourses && failedCourses.length > 0) {
    const fList = failedCourses.slice(0, 4).map((c) => `${c.courseCode} (Sem ${c.semester})`).join(', ');
    weaknesses.push(`Mandatory Retake Alert: ${failedCourses.length} course(s) currently hold an 'F' grade (${fList}).`);
  }
  if (theoryGpa < sessionalGpa - 0.20) {
    weaknesses.push(`Gap of ${(sessionalGpa - theoryGpa).toFixed(2)} GPA points between practical labs (${sessionalGpa.toFixed(2)}) and theory exams (${theoryGpa.toFixed(2)}).`);
  }
  if (totalAttendanceMarksLost > 0) {
    weaknesses.push(`Forfeited ${totalAttendanceMarksLost} continuous assessment marks due to class attendance dropping below 90%.`);
  }
  if (laggingCourses.length > 0) {
    const sampleNames = laggingCourses.slice(0, 4).map((c) => `${c.courseCode} (${c.grade}, ${c.marks ?? 'N/A'}%)`).join(', ');
    weaknesses.push(`Lower grade points (< 3.00 GP) recorded in ${laggingCourses.length} course(s), including ${sampleNames}.`);
  }
  if (weaknesses.length === 0) {
    weaknesses.push(`No critical performance bottlenecks detected. Keep maintaining consistent ≥90% attendance and exam preparation.`);
  }

  const improvementPlan = [];
  if (failedCourses && failedCourses.length > 0) {
    improvementPlan.push({
      priority: 'High',
      category: 'Retake & Backlog Clearance',
      action: `Prioritize clearing your ${failedCourses.length} failed ('F') course(s): ${failedCourses.map((c) => c.courseCode).join(', ')}.`,
      impact: 'Replacing 0.00 GP with passing grades immediately restores earned credits and boosts cumulative CGPA.'
    });
  }
  improvementPlan.push({
    priority: 'High',
    category: 'Attendance & Continuous Assessment Lock-In',
    action: 'Maintain strictly ≥ 90% class attendance in all courses to claim the full 10/10 marks under PUST Ordinance Sec 20.8 (iv).',
    impact: `You previously lost ${totalAttendanceMarksLost} attendance marks; recovering +4 to +5 marks per course automatically upgrades D/C/B- borderline scores to the next grade tier.`
  });
  improvementPlan.push({
    priority: 'High',
    category: 'High-Weight 3.0-Credit Theory Mastery',
    action: 'Allocate 65%+ of weekly study hours to 3.0-credit core theory courses.',
    impact: 'A 3.0-credit theory course carries double the CGPA weight of a 1.5-credit lab and 4x the weight of a 0.75-credit sessional.'
  });
  if (remainingSemesters.some((s) => s.semester >= 7)) {
    improvementPlan.push({
      priority: 'Medium',
      category: 'Senior Thesis & Capstone (CSE 4100 & CSE 4200)',
      action: 'Deliver consistent bi-weekly thesis milestones to your supervisor in Semesters 7 & 8.',
      impact: 'Thesis carries 4.5 cumulative credits; securing an A/A+ provides substantial upward leverage on final graduation CGPA.'
    });
  }

  const mistakesToAvoid = [
    'Never let attendance drop below 90%: PUST Ordinance Sec 20.8 (iv) grants 10 marks for ≥90%, but drops to 5 marks at 60–69% and 0 marks below 60%. Those lost 5 marks directly demote every course by a full letter grade.',
    'Do not under-prepare for 3.0-credit theory finals: Written finals carry 70 marks in theory courses. Relying only on sessional labs cannot compensate for low theory grades.',
    'Do not ignore low Continuous Assessment (CA) / Class Test marks: Always sit for all class tests and submit every assignment before the deadline to secure 16+/20 in CA.'
  ];

  const liveMessageNarrative = `🎓 1. Final 8-Semester Degree Forecast:
Based on your ${trajectory.completedCredits} completed credits across ${trajectory.completedSemestersCount} published semesters, your current CGPA is ${currentCGPA.toFixed(2)} / 4.00 and your projected 8-semester graduation CGPA is ${projectedFinalCGPA.toFixed(2)} / 4.00 (${standingCategory}). Your mathematical ceiling with 4.00 in remaining credits is ${trajectory.maxAchievableCGPA.toFixed(2)}.

📋 2. Suggested Improvement Plan:
${improvementPlan.map((p) => `• [${p.category}]: ${p.action}`).join('\n')}

⚠️ 3. Critical Mistakes to Avoid:
${mistakesToAvoid.map((m, idx) => `• Mistake ${idx + 1}: ${m}`).join('\n')}

✨ Consistent attendance and structured exam preparation will steadily elevate your academic standing!`;

  return {
    summary: `${student.name || 'Student'} currently holds a cumulative CGPA of ${currentCGPA.toFixed(2)} / 4.00 across ${trajectory.completedSemestersCount} published semesters (${trajectory.completedCredits} credits). Credit trajectory modeling projects a final 8-semester graduation CGPA of ${projectedFinalCGPA.toFixed(2)} (${standingCategory}), with a maximum reachable ceiling of ${trajectory.maxAchievableCGPA.toFixed(2)}.`,
    standingCategory,
    strengths,
    weaknesses,
    improvementPlan,
    mistakesToAvoid,
    liveMessageNarrative,
    motivationalQuote: 'Consistent daily effort in attendance, class tests, and core theory courses transforms your academic trajectory semester by semester.'
  };
}

/**
 * Calls Gemini API to get a personalized academic evaluation
 */
async function generateAIEvaluation(student, trajectory) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = generateRuleBasedAdvisor(student, trajectory);

  if (!apiKey) {
    return { ...fallback, source: 'rule-engine' };
  }

  try {
    const semSummaryText = trajectory.semesterBreakdown
      .map((s) => `Sem ${s.semester}: SGPA ${s.sgpa.toFixed(2)}, CGPA ${s.cgpa.toFixed(2)}, Earned ${s.earnedCredits}/${s.credits} cr, Failed: ${s.failedCount}`)
      .join(' | ');

    const prompt = `You are the Senior Academic Dean and AI Advisor for the Department of Computer Science and Engineering at Pabna University of Science and Technology (PUST).
Evaluate the following student's official record:
- Name: ${student.name} (ID: ${student.studentId})
- Completed Semesters: ${trajectory.completedSemestersCount} of 8 (${semSummaryText})
- Completed Credits: ${trajectory.completedCredits} / ${trajectory.totalDegreeCredits}
- Current CGPA: ${trajectory.currentCGPA.toFixed(2)} / 4.00 (${trajectory.currentStanding})
- Projected 8-Semester CGPA: ${trajectory.projectedFinalCGPA.toFixed(2)} / 4.00 (${trajectory.projectedStanding})
- Maximum Achievable Ceiling: ${trajectory.maxAchievableCGPA.toFixed(2)} / 4.00
- Theory GPA: ${trajectory.theoryGpa.toFixed(2)} | Sessional GPA: ${trajectory.sessionalGpa.toFixed(2)}
- Attendance Marks Lost: ${trajectory.totalAttendanceMarksLost} marks
- Failed Courses: ${trajectory.failedCourses.map((c) => `${c.courseCode} (Sem ${c.semester})`).join(', ') || 'None'}

Return strictly valid JSON:
{
  "summary": "2-3 sentences executive diagnosis with exact numbers.",
  "standingCategory": "${fallback.standingCategory}",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvementPlan": [
    { "priority": "High", "category": "Title", "action": "Concrete step", "impact": "Measurable impact" }
  ],
  "motivationalQuote": "Inspiring remark."
}`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let aiResponseText = null;

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3500),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          })
        });

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          aiResponseText = data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (_) {}
    }

    if (!aiResponseText) {
      return { ...fallback, source: 'rule-engine' };
    }

    const cleanJson = aiResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      summary: parsed.summary || fallback.summary,
      standingCategory: fallback.standingCategory,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : fallback.strengths,
      weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : fallback.weaknesses,
      improvementPlan: Array.isArray(parsed.improvementPlan) && parsed.improvementPlan.length > 0 ? parsed.improvementPlan : fallback.improvementPlan,
      mistakesToAvoid: fallback.mistakesToAvoid,
      liveMessageNarrative: fallback.liveMessageNarrative,
      motivationalQuote: parsed.motivationalQuote || fallback.motivationalQuote,
      source: 'ai-advisor'
    };
  } catch (err) {
    return { ...fallback, source: 'rule-engine' };
  }
}

/**
 * Helper: Extracts requested semester number(s) (1..8) from natural language query
 * e.g. "tell me about semester 6 result", "6th semester", "sem 6", "3rd year 2nd semester", "3-2"
 */
function extractRequestedSemesters(question = '') {
  const q = String(question || '').toLowerCase();
  const found = new Set();

  // Map Bengali digits ১-৮ to 1-8
  const normalized = q.replace(/[১-৮]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

  // Year-Semester patterns e.g. "3rd year 2nd semester", "year 3 sem 2", "3-2"
  const yearSemMatch = normalized.match(/(?:(\d)(?:st|nd|rd|th)?\s*year\s*(\d)(?:st|nd|rd|th)?\s*(?:sem|semester|term))|(?:year\s*(\d)\s*(?:sem|semester|term)\s*(\d))|\b([1-4])\s*-\s*([1-2])\b/);
  if (yearSemMatch) {
    const y = Number(yearSemMatch[1] || yearSemMatch[3] || yearSemMatch[5]);
    const s = Number(yearSemMatch[2] || yearSemMatch[4] || yearSemMatch[6]);
    if (y >= 1 && y <= 4 && (s === 1 || s === 2)) {
      found.add((y - 1) * 2 + s);
    }
  }

  // Direct patterns: "semester 6", "sem 6", "term 6", "сеমিস্টার 6", "semester-6"
  const directRegex = /\b(?:semester|sem|term|সেমিস্টার)[\s\-:#]*([1-8])\b/g;
  let m;
  while ((m = directRegex.exec(normalized)) !== null) {
    found.add(Number(m[1]));
  }

  // Ordinal before semester: "6th semester", "1st sem", "2nd term", "6 সেমিস্টার"
  // Note: exclude "8-semester" or "8 semester" when preceded by "final" or "predicted" or "all"
  const ordinalRegex = /\b([1-8])(?:st|nd|rd|th)\s*(?:semester|sem|term|সেমিস্টার)\b/g;
  while ((m = ordinalRegex.exec(normalized)) !== null) {
    found.add(Number(m[1]));
  }

  // Word ordinals & numbers with semester
  const wordMap = {
    first: 1, one: 1, 'প্রথম': 1,
    second: 2, two: 2, 'দ্বিতীয়': 2, 'দ্বিতীয়': 2,
    third: 3, three: 3, 'তৃতীয়': 3, 'তৃতীয়': 3,
    fourth: 4, four: 4, 'চতুর্থ': 4,
    fifth: 5, five: 5, 'পঞ্চম': 5,
    sixth: 6, six: 6, 'ষষ্ঠ': 6,
    seventh: 7, seven: 7, 'সপ্তম': 7,
    eighth: 8, eight: 8, 'অষ্টম': 8
  };

  Object.entries(wordMap).forEach(([word, num]) => {
    const r1 = new RegExp(`\\b${word}\\s+(?:semester|sem|term|সেমিস্টার)\\b`, 'i');
    const r2 = new RegExp(`\\b(?:semester|sem|term|সেমিস্টার)\\s+${word}\\b`, 'i');
    if (r1.test(normalized) || r2.test(normalized)) {
      found.add(num);
    }
  });

  // Roman numerals: "semester vi", "sem iv"
  const romanMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
  const romanRegex = /\b(?:semester|sem|term)\s+(viii|vii|vi|iv|iii|ii|v|i)\b/gi;
  while ((m = romanRegex.exec(normalized)) !== null) {
    const rVal = romanMap[m[1].toLowerCase()];
    if (rVal) found.add(rVal);
  }

  // Range e.g. "semester 5 and 6" or "semesters 1 to 6"
  const andRegex = /\b(?:semesters?|sems?)\s*([1-8])\s*(?:and|&|,|vs|to)\s*([1-8])\b/gi;
  while ((m = andRegex.exec(normalized)) !== null) {
    found.add(Number(m[1]));
    found.add(Number(m[2]));
  }

  return Array.from(found).sort((a, b) => a - b);
}

/**
 * Helper: Builds a rich 5-Vision ("Multivisional") Analysis for a specific semester
 */
function buildSemesterMultivisionalReport(semNum, student, trajectory, websiteData = {}) {
  const semData = (trajectory.semesterBreakdown || []).find((s) => Number(s.semester) === Number(semNum));
  const cohort = websiteData.semesterCohortStats?.[semNum] || null;
  const semRankBySgpa = [...(trajectory.semesterBreakdown || [])].sort((a, b) => b.sgpa - a.sgpa);
  const personalSemRank = semRankBySgpa.findIndex((s) => Number(s.semester) === Number(semNum)) + 1;

  // Case A: Semester is published in student's official records
  if (semData) {
    const courses = semData.courses || [];
    const courseLines = courses.map((c) => {
      const breakdownParts = [];
      if (c.attendanceMarks !== null && c.attendanceMarks !== undefined) {
        breakdownParts.push(`Att: ${c.attendanceMarks}/10${c.attendancePercentage !== null ? ` (${c.attendancePercentage}%)` : ''}`);
      }
      if (c.caMarks !== null && c.caMarks !== undefined) {
        breakdownParts.push(`CA: ${c.caMarks}`);
      }
      if (c.finalMarks !== null && c.finalMarks !== undefined) {
        breakdownParts.push(`Final: ${c.finalMarks}`);
      }
      const subBreakdown = breakdownParts.length > 0 ? ` [${breakdownParts.join(', ')}]` : '';
      const statusBadge = c.status === 'failed' || c.grade === 'F' ? '❌ RETAKE' : c.gradePoint >= 3.75 ? '🌟' : c.gradePoint >= 3.00 ? '✅' : '⚠️';
      return `- **${c.courseCode} — ${c.courseTitle}** (${c.credits} Cr, ${c.courseType === 'sessional' ? 'Lab/Sessional' : 'Theory'}): **${c.marks !== null ? `${c.marks}/100` : 'N/A'}**${subBreakdown} → Grade: **${c.grade}** (**${c.gradePoint.toFixed(2)} GP**) ${statusBadge}`;
    });

    const topText = semData.topCourses && semData.topCourses.length > 0
      ? semData.topCourses.map((c) => `${c.courseCode} (${c.marks ?? 'N/A'} marks, Grade ${c.grade}, ${c.gradePoint.toFixed(2)} GP)`).join(', ')
      : 'N/A';

    const weakText = semData.weakestCourses && semData.weakestCourses.length > 0
      ? semData.weakestCourses.map((c) => `${c.courseCode} (${c.marks ?? 'N/A'} marks, Grade ${c.grade}, ${c.gradePoint.toFixed(2)} GP)`).join(', ')
      : 'None';

    const prevSem = (trajectory.semesterBreakdown || []).find((s) => Number(s.semester) === Number(semNum) - 1);
    const nextSem = (trajectory.semesterBreakdown || []).find((s) => Number(s.semester) === Number(semNum) + 1);

    let momentumLine = `This was your opening semester, setting your initial baseline CGPA at **${semData.cgpa.toFixed(2)}**.`;
    if (prevSem && semData.deltaSgpa !== null) {
      const dir = semData.deltaSgpa > 0 ? `improved by **+${semData.deltaSgpa.toFixed(2)} SGPA** 📈` : semData.deltaSgpa < 0 ? `dipped by **${semData.deltaSgpa.toFixed(2)} SGPA** 📉` : `remained steady at **${semData.sgpa.toFixed(2)} SGPA**`;
      const cgpaDir = semData.deltaCgpa > 0 ? `+${semData.deltaCgpa.toFixed(2)}` : `${semData.deltaCgpa.toFixed(2)}`;
      momentumLine = `Compared to Semester ${prevSem.semester} (SGPA **${prevSem.sgpa.toFixed(2)}**), your Semester ${semNum} performance ${dir}, shifting your cumulative CGPA from **${prevSem.cgpa.toFixed(2)} → ${semData.cgpa.toFixed(2)}** (${cgpaDir}).`;
    }
    if (nextSem) {
      const nextDelta = Number((nextSem.sgpa - semData.sgpa).toFixed(2));
      momentumLine += ` In the following term (Semester ${nextSem.semester}), your SGPA moved to **${nextSem.sgpa.toFixed(2)}** (${nextDelta >= 0 ? `+${nextDelta.toFixed(2)}` : nextDelta.toFixed(2)}).`;
    }

    const batchBenchmarkLine = cohort
      ? `- **Batch Cohort Comparison:** Ranked **#${cohort.myRank || 'N/A'} out of ${cohort.totalStudents} students** in Semester ${semNum} (Batch Avg SGPA: **${cohort.avgSgpa.toFixed(2)}** • Highest: **${cohort.highestSgpa.toFixed(2)}** • Lowest: **${cohort.lowestSgpa.toFixed(2)}**)`
      : '';

    // Simulate what happens if attendance was >=90% (10/10 marks) in Semester N
    let simulatedBoostPoints = 0;
    let upgradableCoursesCount = 0;
    courses.forEach((c) => {
      if (c.marks !== null && c.attendanceMarks !== null && c.attendanceMarks < 10) {
        const gain = 10 - c.attendanceMarks;
        const newMarks = c.marks + gain;
        // Check if grade tier jumps (40, 45, 50, 55, 60, 65, 70, 75, 80)
        const oldTier = Math.floor(Math.max(35, Math.min(80, c.marks)) / 5);
        const newTier = Math.floor(Math.max(35, Math.min(80, newMarks)) / 5);
        if (newTier > oldTier) {
          upgradableCoursesCount++;
          simulatedBoostPoints += c.credits * 0.25 * (newTier - oldTier);
        }
      }
    });
    const simulatedSgpa = semData.credits > 0
      ? Math.min(4.00, Number((semData.sgpa + (simulatedBoostPoints / semData.credits)).toFixed(2)))
      : semData.sgpa;

    return `### 🎓 Semester ${semNum} (${semData.label}) — Multivisional Result Analysis

#### 🎯 Vision 1: Official Standing & Executive Summary
- **Student:** **${student.name}** (ID: \`${student.studentId}\`) • **Session:** ${semData.session} (Exam Year: ${semData.examYear})
- **Semester ${semNum} SGPA:** **${semData.sgpa.toFixed(2)} / 4.00** (Total Grade Points: **${semData.gradePoints.toFixed(2)}** across **${semData.credits} Credits**)
- **Cumulative CGPA (Up to Sem ${semNum}):** **${semData.cgpa.toFixed(2)} / 4.00** (${semData.academicStanding})
- **Academic Year ${semData.academicYear} YGPA:** **${semData.ygpa.toFixed(2)} / 4.00**
- **Credits & Pass Status:** **${semData.earnedCredits} / ${semData.credits} Credits Earned** • **Passed:** ${semData.passedCount}/${semData.coursesCount} courses${semData.failedCount > 0 ? ` • **Failed (Retake):** ${semData.failedCount} course(s)` : ' (Zero failed courses ✅)'}
- **Personal Semester Rank:** **#${personalSemRank} best semester** out of your ${trajectory.completedSemestersCount} published semesters
${batchBenchmarkLine}

#### 📚 Vision 2: Complete Course-by-Course Grade & Marks Breakdown (${semData.coursesCount} Courses)
${courseLines.join('\n')}

#### 🔬 Vision 3: Multi-Dimensional Assessment Diagnostics (Theory vs. Lab & Continuous Marks)
- **Theory vs. Lab Split:** Theory GPA in Sem ${semNum} is **${semData.theoryGpa.toFixed(2)}** (${semData.theoryCredits} Cr) vs. Sessional/Lab GPA of **${semData.sessionalGpa.toFixed(2)}** (${semData.sessionalCredits} Cr) — ${semData.sessionalGpa >= semData.theoryGpa ? `your practical labs outperformed written theory by **+${(semData.sessionalGpa - semData.theoryGpa).toFixed(2)} GPA**` : `your theory papers outperformed labs by **+${(semData.theoryGpa - semData.sessionalGpa).toFixed(2)} GPA**`}.
- **Strongest Courses in Sem ${semNum}:** ${topText}
- **Lowest / Bottleneck Courses in Sem ${semNum}:** ${weakText}
- **Attendance & CA Efficiency:** Average attendance was **${semData.avgAttendance !== null ? `${semData.avgAttendance}%` : 'N/A'}**, earning **${semData.attMarksEarned}/${semData.attMarksMax}** attendance marks (**${semData.attMarksLost} free marks lost** under PUST Ordinance Sec 20.8 iv).${semData.avgCaMarks !== null ? ` Average CA score: **${semData.avgCaMarks}** | Average Final Exam score: **${semData.avgFinalMarks ?? 'N/A'}**.` : ''}

#### 📈 Vision 4: Momentum Shift & Historical Trajectory
- **Semester Progression:** ${momentumLine}
- **Overall Degree Context:** Across all ${trajectory.completedSemestersCount} published semesters, your current overall CGPA is **${trajectory.currentCGPA.toFixed(2)} / 4.00**, with a projected 8-semester graduation CGPA of **${trajectory.projectedFinalCGPA.toFixed(2)} / 4.00** (Max Ceiling: **${trajectory.maxAchievableCGPA.toFixed(2)}**).

#### 🚀 Vision 5: Counterfactual Simulation & Strategic Takeaways
- **What-If Attendance Simulation:** Had you maintained **≥90% attendance (10/10 marks)** across all Semester ${semNum} courses, **${upgradableCoursesCount} course(s)** would have crossed into higher grade tiers, lifting your Semester ${semNum} SGPA from **${semData.sgpa.toFixed(2)} → ~${simulatedSgpa.toFixed(2)}**!
- **Actionable Takeaway:** ${semData.failedCount > 0 ? `Prioritize retaking **${semData.failedCourses.map((c) => c.courseCode).join(', ')}** at the earliest opportunity.` : `Focus on lifting 3.0-credit theory exam scores (where marks were in the 40–55 range) by locking in ≥90% attendance (10/10 marks) and 16+/20 in Class Tests.`}`;
  }

  // Case B: Semester is not published yet (future or ongoing semester)
  const futureCourses = SEMESTER_COURSES[semNum] || [];
  const totalFutureCr = futureCourses.reduce((s, c) => s + (Number(c.credits) || 0), 0);
  const isCurrentActiveSem = Number(semNum) === Number(student.currentSemester || student.semester || 7);

  let liveActiveBlock = '';
  if (isCurrentActiveSem && websiteData) {
    const liveAtt = (websiteData.liveAttendance || []).filter((a) => a.totalSessions > 0);
    const attText = liveAtt.length > 0
      ? liveAtt.map((a) => `${a.courseCode}: ${a.attendedSessions}/${a.totalSessions} classes (${a.percentage}%, ~${a.estimatedMarks}/10 marks)`).join(' | ')
      : 'No live attendance sessions recorded yet.';
    const activeAssignCount = (websiteData.assignmentsSummary || []).length;
    const submittedCount = (websiteData.assignmentsSummary || []).filter((a) => a.submitted).length;
    liveActiveBlock = `\n#### 📡 Live Website Activity for Active Semester ${semNum}
- **Live Biometric Attendance:** ${attText}
- **Course Assignments:** ${submittedCount} submitted out of ${activeAssignCount} posted assignments
- **Weekly Routine Slots:** ${(websiteData.routineSummary || []).length} scheduled weekly classes`;
  }

  return `### 📅 Semester ${semNum} (${SEMESTER_LABELS[semNum] || `Semester ${semNum}`}) — Curriculum & Projection Preview

Official final results for **Semester ${semNum}** have not been published yet (you currently have **${trajectory.completedSemestersCount} published semesters** with a CGPA of **${trajectory.currentCGPA.toFixed(2)} / 4.00**).

#### 📚 Official Curriculum for Semester ${semNum} (${futureCourses.length} Courses • ${totalFutureCr} Credits)
${futureCourses.map((c) => `- **${c.code} — ${c.title}** (${c.credits} Credits, ${getCourseType(c.code, c.title) === 'sessional' ? 'Lab/Sessional' : 'Theory'})`).join('\n')}
${liveActiveBlock}

#### 🎯 Target SGPA Benchmarks for Semester ${semNum}
- **Projected SGPA at Current Momentum:** **${trajectory.projectedFutureSgpa.toFixed(2)} / 4.00** (leads to **${trajectory.projectedFinalCGPA.toFixed(2)}** final CGPA)
- **Maximum Reachable Graduation Ceiling (with 4.00 SGPA):** **${trajectory.maxAchievableCGPA.toFixed(2)} / 4.00**
- **Required SGPA for First Class (3.00 CGPA):** **${trajectory.requiredSgpas.firstClass_3_00.isPossible ? (trajectory.requiredSgpas.firstClass_3_00.requiredSgpa <= 0 ? 'Already Secured' : `${trajectory.requiredSgpas.firstClass_3_00.requiredSgpa} SGPA`) : 'Out of mathematical reach (focus on maximizing SGPA ≥ 3.50)'}**`;
}

/**
 * Helper: Builds a Multi-Semester Comparison or Full Transcript Overview
 */
function buildAllSemestersOverview(student, trajectory, websiteData = {}) {
  const sems = trajectory.semesterBreakdown || [];
  if (sems.length === 0) {
    return `No published semester results found yet for **${student.name}** (\`${student.studentId}\`).`;
  }

  const rows = sems.map((s) => {
    const cStat = websiteData.semesterCohortStats?.[s.semester];
    const rankStr = cStat?.myRank ? ` • Batch Rank: #${cStat.myRank}/${cStat.totalStudents}` : '';
    const deltaStr = s.deltaSgpa !== null ? ` (${s.deltaSgpa >= 0 ? `+${s.deltaSgpa.toFixed(2)}` : s.deltaSgpa.toFixed(2)})` : '';
    return `- **Semester ${s.semester}** (${s.label}): **SGPA ${s.sgpa.toFixed(2)}**${deltaStr} | **CGPA ${s.cgpa.toFixed(2)}** | **YGPA ${s.ygpa.toFixed(2)}** | Credits: ${s.earnedCredits}/${s.credits} | Theory: ${s.theoryGpa.toFixed(2)} vs Lab: ${s.sessionalGpa.toFixed(2)}${rankStr}`;
  });

  const dist = trajectory.gradeDistribution;
  const distLine = Object.entries(dist)
    .filter(([, count]) => count > 0)
    .map(([g, count]) => `**${g}**: ${count}`)
    .join(' • ');

  return `### 📊 Complete Multivisional Transcript Overview (Semesters 1 to ${trajectory.completedSemestersCount})

#### 1. Semester-by-Semester Progression
${rows.join('\n')}

#### 2. Cumulative Multi-Dimensional Metrics
- **Overall Current CGPA:** **${trajectory.currentCGPA.toFixed(2)} / 4.00** (${trajectory.currentStanding})
- **Completed Credits:** **${trajectory.completedEarnedCredits} earned** of **${trajectory.completedCredits} attempted** (Total Degree: **${trajectory.totalDegreeCredits} Cr**)
- **Theory vs. Sessional Lab Split:** Theory GPA **${trajectory.theoryGpa.toFixed(2)}** (${trajectory.theoryCredits} Cr) vs. Sessional Lab GPA **${trajectory.sessionalGpa.toFixed(2)}** (${trajectory.sessionalCredits} Cr)
- **Peak vs. Lowest Semester:** Best in **Semester ${trajectory.bestSemester?.semester}** (**${trajectory.bestSemester?.sgpa.toFixed(2)} SGPA**) • Lowest in **Semester ${trajectory.lowestSemester?.semester}** (**${trajectory.lowestSemester?.sgpa.toFixed(2)} SGPA**)
- **Grade Distribution:** ${distLine || 'N/A'}
- **Attendance Marks Summary:** Earned **${trajectory.totalAttendanceMarksEarned}/${trajectory.totalAttendanceMarksPossible}** marks (**${trajectory.totalAttendanceMarksLost} marks lost** due to <90% attendance)

#### 3. 8-Semester Graduation Forecast
- **Projected Final 8-Semester CGPA:** **${trajectory.projectedFinalCGPA.toFixed(2)} / 4.00** (${trajectory.projectedStanding})
- **Maximum Reachable Ceiling:** **${trajectory.maxAchievableCGPA.toFixed(2)} / 4.00** (${trajectory.remainingCredits} credits remaining across ${trajectory.remainingSemestersCount} semester(s))

💡 *Tip: Ask me **"Tell me about Semester 6 result"** (or any semester 1–8) to see every course mark, CA/Final breakdown, and counterfactual simulation!*`;
}

/**
 * Helper: Detects if the user is asking about a specific course by code or title
 */
function findMatchingCourseInCurriculumOrResults(question, trajectory) {
  const q = String(question || '').toLowerCase();

  // Check explicit course code like "cse 3203", "cse-3203", "cse3203", "math 1101", "hum 4101"
  const codeMatch = q.match(/\b(cse|math|eee|ece|hum|stat|phy|me)[\s\-]*(\d{4})\b/i);
  if (codeMatch) {
    const targetCode = `${codeMatch[1].toUpperCase()} ${codeMatch[2]}`;
    const completedMatch = (trajectory.allCoursesFlat || []).find(
      (c) => c.courseCode.replace(/\s+/g, ' ').toUpperCase() === targetCode
    );
    let currSem = null;
    let currItem = null;
    for (let s = 1; s <= 8; s++) {
      const found = (SEMESTER_COURSES[s] || []).find((c) => c.code.toUpperCase() === targetCode);
      if (found) {
        currSem = s;
        currItem = found;
        break;
      }
    }
    if (completedMatch || currItem) {
      return { code: targetCode, semester: completedMatch?.semester || currSem, completedMatch, currItem };
    }
  }

  // Check by course title keywords (minimum length 5 to avoid false matches)
  for (let s = 1; s <= 8; s++) {
    for (const c of SEMESTER_COURSES[s] || []) {
      const titleLow = c.title.toLowerCase();
      if (titleLow !== 'viva voce' && titleLow !== 'thesis' && q.includes(titleLow)) {
        const completedMatch = (trajectory.allCoursesFlat || []).find(
          (rc) => rc.courseCode.toUpperCase() === c.code.toUpperCase()
        );
        return { code: c.code, semester: s, completedMatch, currItem: c };
      }
    }
  }

  return null;
}

/**
 * Live interactive Q&A with AI Academic Advisor (Multivisional + Full Website Data Learning)
 */
async function answerAcademicQuestion(student, trajectory, question, websiteData = {}, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const qRaw = String(question || '').trim();
  const qNorm = qRaw.toLowerCase();

  const currentCGPA = trajectory.currentCGPA;
  const projectedCGPA = trajectory.projectedFinalCGPA;
  const maxCGPA = trajectory.maxAchievableCGPA;
  const completedCredits = trajectory.completedCredits;
  const remainingCredits = trajectory.remainingCredits;
  const remainingSemCount = trajectory.remainingSemestersCount;
  const standing = trajectory.projectedStanding || getAcademicStandingCategory(projectedCGPA);

  // ── 1. CHECK FOR SPECIFIC SEMESTER RESULT REQUEST (e.g. "tell me about semester 6 result", "sem 5", "compare sem 5 and 6") ──
  const requestedSems = extractRequestedSemesters(qRaw);
  const isAllSemestersQuery =
    (qNorm.includes('all semester') ||
      qNorm.includes('every semester') ||
      qNorm.includes('semester wise') ||
      qNorm.includes('semester-wise') ||
      qNorm.includes('full transcript') ||
      qNorm.includes('all result') ||
      qNorm.includes('all my result')) &&
    requestedSems.length === 0;

  let deterministicReply = null;
  let isExactDataMatch = false;

  if (requestedSems.length === 1) {
    deterministicReply = buildSemesterMultivisionalReport(requestedSems[0], student, trajectory, websiteData);
    isExactDataMatch = true;
  } else if (requestedSems.length > 1) {
    const reports = requestedSems.map((sNum) => buildSemesterMultivisionalReport(sNum, student, trajectory, websiteData));
    deterministicReply = reports.join('\n\n---\n\n');
    isExactDataMatch = true;
  } else if (isAllSemestersQuery) {
    deterministicReply = buildAllSemestersOverview(student, trajectory, websiteData);
    isExactDataMatch = true;
  }

  // ── 2. CHECK FOR SPECIFIC COURSE INQUIRY (e.g., "CSE 3203", "Operating Systems", "CSE 4101") ──
  if (!deterministicReply) {
    const courseMatch = findMatchingCourseInCurriculumOrResults(qRaw, trajectory);
    if (courseMatch) {
      const { code, semester, completedMatch, currItem } = courseMatch;
      const title = completedMatch?.courseTitle || currItem?.title || code;
      const credits = completedMatch?.credits || currItem?.credits || 3.0;
      const type = completedMatch?.courseType || getCourseType(code, title);

      const routineSlots = (websiteData.routineSummary || []).filter((r) => String(r.courseCode || '').toUpperCase() === code);
      const liveAtt = (websiteData.liveAttendance || []).find((a) => String(a.courseCode || '').toUpperCase() === code);
      const courseAssigns = (websiteData.assignmentsSummary || []).filter((a) => String(a.courseCode || '').toUpperCase() === code);
      const courseMaterials = (websiteData.materialsSummary || []).filter((m) => String(m.courseCode || '').toUpperCase() === code);
      const assignedTeacher = (websiteData.teachersSummary || []).find((t) => (t.courses || []).some((c) => String(c).toUpperCase() === code));

      let resultBlock = `- **Official Result Status:** Not yet published (Scheduled in Semester ${semester}).`;
      if (completedMatch) {
        resultBlock = `- **Published Result (Semester ${completedMatch.semester}):**
  • **Total Marks:** **${completedMatch.marks ?? 'N/A'} / 100** (Attendance: **${completedMatch.attendanceMarks ?? 'N/A'}/10** [${completedMatch.attendancePercentage ?? 'N/A'}%], CA: **${completedMatch.caMarks ?? 'N/A'}**, Final Exam: **${completedMatch.finalMarks ?? 'N/A'}**)
  • **Letter Grade & GP:** **${completedMatch.grade}** (**${completedMatch.gradePoint.toFixed(2)} GP** • **${completedMatch.creditPoints} Credit Points**)
  • **Status:** **${completedMatch.status === 'passed' ? 'Passed ✅' : 'Failed — Retake Required ❌'}**`;
      }

      deterministicReply = `### 📘 Course Intelligence Report: ${code} — ${title}

- **Semester:** Semester ${semester} (${SEMESTER_LABELS[semester] || `Semester ${semester}`})
- **Credit Weight:** **${credits} Credits** (${type === 'sessional' ? 'Sessional / Laboratory' : 'Core Theory'})
- **Course Instructor:** ${assignedTeacher ? `**${assignedTeacher.name}** (${assignedTeacher.designation}, Email: \`${assignedTeacher.email}\`)` : (routineSlots[0]?.teacherName ? `**${routineSlots[0].teacherName}**` : 'Department Faculty')}
${resultBlock}

#### 🌐 Live Website Data for ${code}
- **Weekly Class Routine:** ${routineSlots.length > 0 ? routineSlots.map((r) => `${r.day} (${r.timeSlot}, Room ${r.room})`).join(' • ') : 'No active routine slots in current term'}
- **Live Biometric Attendance:** ${liveAtt && liveAtt.totalSessions > 0 ? `${liveAtt.attendedSessions}/${liveAtt.totalSessions} sessions attended (${liveAtt.percentage}% → ~${liveAtt.estimatedMarks}/10 marks)` : 'N/A for this term'}
- **Posted Assignments:** ${courseAssigns.length > 0 ? courseAssigns.map((a) => `${a.title} (${a.status}${a.obtainedMarks !== null ? `: ${a.obtainedMarks}/${a.totalMarks}` : ''})`).join(', ') : 'None currently posted'}
- **Study Materials Uploaded:** ${courseMaterials.length > 0 ? courseMaterials.map((m) => m.title).join(', ') : 'None uploaded yet'}`;
      isExactDataMatch = true;
    }
  }

  // ── 3. CHECK FOR FAILED / RETAKE / WEAK COURSES QUERY ──
  if (!deterministicReply && (qNorm.includes('fail') || qNorm.includes('retake') || qNorm.includes('backlog') || qNorm.includes('weak') || qNorm.includes('worst') || qNorm.includes('low grade') || qNorm.includes('low mark'))) {
    const failed = trajectory.failedCourses || [];
    const lowestAll = [...(trajectory.allCoursesFlat || [])]
      .sort((a, b) => (a.marks ?? 999) - (b.marks ?? 999))
      .slice(0, 8);

    const fBlock = failed.length > 0
      ? failed.map((c) => `- ❌ **${c.courseCode} — ${c.courseTitle}** (Sem ${c.semester}, ${c.credits} Cr): **${c.marks ?? 0}/100** → **Grade F (0.00 GP)**`).join('\n')
      : `- ✅ **Zero Failed ('F') Courses!** You have passed every course across all ${trajectory.completedSemestersCount} published semesters.`;

    const lowBlock = lowestAll.map(
      (c) => `- ⚠️ **${c.courseCode} — ${c.courseTitle}** (Sem ${c.semester}, ${c.credits} Cr): **${c.marks ?? 'N/A'}/100** [Att: ${c.attendanceMarks ?? 'N/A'}/10, CA: ${c.caMarks ?? 'N/A'}, Final: ${c.finalMarks ?? 'N/A'}] → **Grade ${c.grade} (${c.gradePoint.toFixed(2)} GP)**`
    ).join('\n');

    deterministicReply = `### 🔍 Multivisional Weakest & Retake Courses Diagnostic

#### 1. Mandatory Retake / Failed ('F') Courses
${fBlock}

#### 2. Lowest Scoring Courses Pushing Down Your CGPA (${currentCGPA.toFixed(2)})
${lowBlock}

#### 3. Root-Cause Diagnosis & Recovery Strategy
- **Attendance Loss Impact:** Across your completed semesters, you lost **${trajectory.totalAttendanceMarksLost} free marks** because attendance was around 60–68% (earning 4–5/10 instead of 10/10).
- **Theory Weight Bottleneck:** Your Theory GPA is **${trajectory.theoryGpa.toFixed(2)}** vs. Sessional Lab GPA of **${trajectory.sessionalGpa.toFixed(2)}**. Lifting 3.0-credit theory scores from Grade D/C (2.00–2.25 GP) to Grade B/B+ (3.00–3.25 GP) is the fastest way to raise your graduation CGPA.`;
    isExactDataMatch = true;
  }

  // ── 4. CHECK FOR BEST / TOP / STRENGTHS QUERY ──
  if (!deterministicReply && (qNorm.includes('best') || qNorm.includes('highest') || qNorm.includes('top course') || qNorm.includes('strength') || qNorm.includes('a+'))) {
    const topCourses = trajectory.topCoursesOverall || [];
    deterministicReply = `### 🌟 Your Top Academic Strengths & Highest Performing Courses

- **Best Semester Overall:** **Semester ${trajectory.bestSemester?.semester}** with an SGPA of **${trajectory.bestSemester?.sgpa.toFixed(2)} / 4.00**
- **Practical Sessional Strength:** Your Sessional/Lab GPA (**${trajectory.sessionalGpa.toFixed(2)}**) exceeds your Theory GPA (**${trajectory.theoryGpa.toFixed(2)}**) by **+${(trajectory.sessionalGpa - trajectory.theoryGpa).toFixed(2)} points**.

#### 🏆 Top 5 Highest Scoring Courses Across Your Degree
${topCourses.map((c, idx) => `${idx + 1}. **${c.courseCode} — ${c.courseTitle}** (Sem ${c.semester}, ${c.credits} Cr): **${c.marks ?? 'N/A'}/100** → **Grade ${c.grade} (${c.gradePoint.toFixed(2)} GP)**`).join('\n')}`;
    isExactDataMatch = true;
  }

  // ── 5. CHECK FOR LIVE WEBSITE DATA QUERIES (Routine, Attendance, Assignments, Class Tests, Teachers, Notices, Materials, Rank) ──
  if (!deterministicReply) {
    if (qNorm.includes('routine') || qNorm.includes('schedule') || qNorm.includes('timetable') || qNorm.includes('class time') || qNorm.includes('room')) {
      const slots = websiteData.routineSummary || [];
      const groupedByDay = {};
      slots.forEach((s) => {
        if (!groupedByDay[s.day]) groupedByDay[s.day] = [];
        groupedByDay[s.day].push(`\`${s.timeSlot}\` **${s.courseCode}** (${s.courseTitle}) — Room **${s.room}** [${s.teacherName || 'Faculty'}]`);
      });
      const dayLines = Object.entries(groupedByDay).map(([day, list]) => `- **${day}:**\n  • ${list.join('\n  • ')}`).join('\n');

      deterministicReply = `### 📅 Live Weekly Class Routine (Semester ${student.currentSemester || student.semester || 7})

${dayLines || 'No active routine slots found for your current semester in the database.'}

- **Standard Daily Slots:** \`09:00 - 01:00\` (Morning), \`01:00 - 02:00\` (Prayer & Lunch Break), \`02:00 - 05:00\` (Afternoon).
- **Biometric Attendance Window:** Opens for **10 minutes** at the start of each scheduled class inside the 10-meter CSE Building geofence.`;
      isExactDataMatch = true;
    } else if (qNorm.includes('assignment') || qNorm.includes('homework') || qNorm.includes('submission') || qNorm.includes('deadline')) {
      const assigns = websiteData.assignmentsSummary || [];
      const submittedCount = assigns.filter((a) => a.submitted).length;
      const pendingCount = assigns.length - submittedCount;

      deterministicReply = `### 📝 Live Course Assignments & Coursework Status

- **Total Posted Assignments:** **${assigns.length}** (Submitted: **${submittedCount}** ✅ • Pending: **${pendingCount}** ⏳)

#### Assignment Details on Website:
${assigns.length > 0
  ? assigns.map((a) => `- **${a.courseCode} — ${a.title}** | Status: **${a.status.toUpperCase()}**${a.obtainedMarks !== null ? ` (**Score: ${a.obtainedMarks}/${a.totalMarks}**)` : ` (Max: ${a.totalMarks} marks)`}${a.dueDate ? ` | Due: ${new Date(a.dueDate).toLocaleDateString()}` : ''}`).join('\n')
  : '- No assignments are currently posted for your active semester.'}`;
      isExactDataMatch = true;
    } else if (qNorm.includes('class test') || qNorm.includes('ct mark') || qNorm.includes('quiz')) {
      const cts = websiteData.classTestsSummary || [];
      deterministicReply = `### 📋 Class Tests (CT) & Continuous Assessment Records

#### Live Class Tests in Current Semester:
${cts.length > 0
  ? cts.map((ct) => `- **${ct.courseCode} — ${ct.title}**: **${ct.obtainedMarks !== null ? `${ct.obtainedMarks} / ${ct.maxMarks}` : `Scheduled (Max: ${ct.maxMarks})`}**`).join('\n')
  : '- No live class test records posted yet for the current semester.'}

#### Historical Continuous Assessment (CA) Summary Across Semesters:
${(trajectory.semesterBreakdown || []).map((s) => `- **Semester ${s.semester}:** Avg CA Marks: **${s.avgCaMarks ?? 'N/A'}/20** • Avg Attendance Marks: **${(s.attMarksEarned / Math.max(1, s.coursesCount)).toFixed(1)}/10** • SGPA: **${s.sgpa.toFixed(2)}**`).join('\n')}`;
      isExactDataMatch = true;
    } else if (qNorm.includes('teacher') || qNorm.includes('faculty') || qNorm.includes('professor') || qNorm.includes('instructor') || qNorm.includes('who teaches')) {
      const teachers = websiteData.teachersSummary || [];
      deterministicReply = `### 👨‍🏫 PUST CSE Faculty & Course Instructors (${teachers.length} Faculty Members)

${teachers.length > 0
  ? teachers.map((t) => `- **${t.name}** (${t.designation}) • Office: **${t.office}** • Email: \`${t.email}\`${t.courses.length > 0 ? ` • Courses: **${t.courses.join(', ')}**` : ''}`).join('\n')
  : '- Faculty directory is available in the department portal.'}`;
      isExactDataMatch = true;
    } else if (qNorm.includes('notice') || qNorm.includes('announcement') || qNorm.includes('circular')) {
      const notices = websiteData.noticesSummary || [];
      deterministicReply = `### 📢 Latest Official & Course Notices on Website

${notices.length > 0
  ? notices.slice(0, 8).map((n) => `- **[${n.courseCode || n.category}] ${n.title}** — Posted by *${n.authorName}* (${n.date ? new Date(n.date).toLocaleDateString() : 'Recent'})${n.hasAudio ? ' 🔊 *[Audio Voice Note Attached]*' : ''}\n  ${n.summary ? `_${n.summary}..._` : ''}`).join('\n')
  : '- No recent notices found.'}`;
      isExactDataMatch = true;
    } else if (qNorm.includes('material') || qNorm.includes('slide') || qNorm.includes('lecture note') || qNorm.includes('study note') || qNorm.includes('pdf')) {
      const mats = websiteData.materialsSummary || [];
      const notes = websiteData.studyNotesSummary || [];
      deterministicReply = `### 📚 Course Study Materials & AI Study Notes on Website

#### Uploaded Teacher Lecture Materials (${mats.length}):
${mats.length > 0
  ? mats.slice(0, 10).map((m) => `- **${m.courseCode} — ${m.title}** (${m.type}) • Uploaded by *${m.uploadedBy}*`).join('\n')
  : '- No lecture materials uploaded for the current semester yet.'}

#### Your Generated AI Study Notes & Quizzes (${notes.length}):
${notes.length > 0
  ? notes.map((n) => `- **${n.courseCode || 'General'} — ${n.title}**${n.quizScore !== null ? ` (Quiz Score: ${n.quizScore})` : ''}`).join('\n')
  : '- You can generate instant AI summaries and practice quizzes inside any Course Workspace!'}`;
      isExactDataMatch = true;
    } else if (qNorm.includes('rank') || qNorm.includes('batch') || qNorm.includes('position') || qNorm.includes('percentile') || qNorm.includes('topper')) {
      const stats = websiteData.semesterCohortStats || {};
      const lines = Object.entries(stats).map(
        ([sem, st]) => `- **Semester ${sem}:** Ranked **#${st.myRank || 'N/A'} of ${st.totalStudents} students** (Your SGPA: **${(trajectory.semesterBreakdown.find((s) => s.semester === Number(sem))?.sgpa || 0).toFixed(2)}** vs. Batch Avg: **${st.avgSgpa.toFixed(2)}** • Top SGPA: **${st.highestSgpa.toFixed(2)}**)`
      );
      deterministicReply = `### 🏆 Batch Cohort Standing & Semester Ranking Analysis

${lines.length > 0 ? lines.join('\n') : 'Cohort ranking data is being compiled.'}

- **Your Overall CGPA:** **${currentCGPA.toFixed(2)} / 4.00** (${trajectory.currentStanding})
- **Projected Final CGPA:** **${projectedCGPA.toFixed(2)} / 4.00**`;
      isExactDataMatch = true;
    } else if (qNorm.includes('attendance') || qNorm.includes('present') || qNorm.includes('absent')) {
      const liveAtt = (websiteData.liveAttendance || []).filter((a) => a.totalSessions > 0);
      const semAttLines = (trajectory.semesterBreakdown || []).map(
        (s) => `- **Semester ${s.semester}:** Avg Attendance **${s.avgAttendance ?? 'N/A'}%** • Marks Earned: **${s.attMarksEarned}/${s.attMarksMax}** (${s.attMarksLost} marks lost)`
      );

      deterministicReply = `### 📌 Multivisional Class Attendance & Ordinance Analysis

#### 1. Live Current Semester Attendance (Biometric + 10m Geofence)
${liveAtt.length > 0
  ? liveAtt.map((a) => `- **${a.courseCode}:** Attended **${a.attendedSessions}/${a.totalSessions}** classes (**${a.percentage}%**) → Estimated Marks: **${a.estimatedMarks}/10**`).join('\n')
  : `- Total biometric check-ins recorded: **${websiteData.totalAttendanceCheckIns || 0}**.`}

#### 2. Historical Attendance Across Published Semesters
${semAttLines.join('\n')}
- **Total Attendance Marks Lost Across Degree:** **${trajectory.totalAttendanceMarksLost} marks**

#### 3. PUST Ordinance Sec 20.8 (iv) Attendance Scale
- **≥ 90%:** 10 Marks (Full) | **85–89%:** 9 Marks | **80–84%:** 8 Marks | **75–79%:** 7 Marks | **70–74%:** 6 Marks | **60–69%:** 5 Marks | **< 60%:** 0 Marks.`;
      isExactDataMatch = true;
    }
  }

  // ── 6. GENERAL FORECAST, IMPROVEMENT PLAN, MISTAKES, HONORS QUERIES ──
  if (!deterministicReply) {
    if (qNorm.includes('plan') || qNorm.includes('improve') || qNorm.includes('better') || qNorm.includes('action') || qNorm.includes('study') || qNorm.includes('boost')) {
      deterministicReply = `### 📋 Multivisional CGPA Improvement Plan for ${student.name}

Based on your **${currentCGPA.toFixed(2)} CGPA** (${completedCredits} completed credits, ${remainingCredits} credits remaining):

1. **Lock In 10/10 Attendance Marks (Highest Immediate ROI):**
   - You lost **${trajectory.totalAttendanceMarksLost} marks** in prior semesters due to attendance averaging ~62–66% (earning 4–5/10 instead of 10/10).
   - Raising attendance to **≥ 90%** adds **+5 free marks** to every course total, immediately converting borderline **41–44 (D)** into **46–49 (C)** and **47 (C)** into **52 (C+)**!
2. **Prioritize 3.0-Credit Theory Finals:**
   - Your Theory GPA (**${trajectory.theoryGpa.toFixed(2)}**) trails your Sessional Lab GPA (**${trajectory.sessionalGpa.toFixed(2)}**). Focus on past-paper problem solving in 3.0-credit theory courses, which carry double the weight of labs.
3. **Maximize Continuous Assessment (CA / Class Tests):**
   - Aim for **16+ / 20** in Class Tests & Assignments so you enter the 70-mark final exam with at least **26/30** already secured.
4. **Senior Thesis & Capstone Leverage (CSE 4100 & CSE 4200):**
   - Your 4th-year Thesis carries **4.5 credits**. Consistent weekly milestones with your supervisor can lock in an **A/A+ (3.75–4.00 GP)**.`;
    } else if (qNorm.includes('mistake') || qNorm.includes('vul') || qNorm.includes('avoid') || qNorm.includes('trap') || qNorm.includes('pitfall') || qNorm.includes('risk')) {
      deterministicReply = `### ⚠️ Critical Mistakes to Avoid (Grounded in Your Transcript Data)

1. **Never Let Attendance Stay in the 60–69% Zone:**
   - In your completed semesters, attendance around 60–66% cost you **${trajectory.totalAttendanceMarksLost} total marks** (losing 5–6 marks per course). Under PUST Ordinance Sec 20.8 (iv), dropping below 60% yields **0/10 marks**.
2. **Avoid Entering Final Exams with Low CA Marks (< 12/20):**
   - Several of your theory courses had CA marks around 10–12/20, forcing heavy pressure onto the 70-mark written final and resulting in D (2.00) or C (2.25) grades.
3. **Do Not Neglect 3.0-Credit Core Theory Courses:**
   - Theory courses represent **${trajectory.theoryCredits} credits** of your completed coursework (Theory GPA: **${trajectory.theoryGpa.toFixed(2)}**). Never give a 3.0-credit theory course the same study time as a 0.75-credit sessional.
4. **Do Not Delay Final-Year Thesis & Project Deliverables:**
   - Late thesis submissions in Semesters 7 & 8 risk losing high-weight grade points across 4.5 credits.`;
    } else if (qNorm.includes('dean') || qNorm.includes('3.8') || qNorm.includes('honor') || qNorm.includes('first class')) {
      const fc = trajectory.requiredSgpas?.firstClass_3_00;
      const us = trajectory.requiredSgpas?.upperSecond_2_50;
      const hn = trajectory.requiredSgpas?.honors_3_75;
      deterministicReply = `### ⭐ Degree Classification & Target SGPA Analysis

- **Current CGPA:** **${currentCGPA.toFixed(2)} / 4.00** (${trajectory.currentStanding})
- **Maximum Mathematical Ceiling (with 4.00 in remaining ${remainingCredits} credits):** **${maxCGPA.toFixed(2)} / 4.00**
- **Projected Final 8-Semester CGPA:** **${projectedCGPA.toFixed(2)} / 4.00** (${standing})

#### Target Benchmarks for Remaining ${remainingSemCount} Semester(s) (${remainingCredits} Credits):
- **Dean's List (3.80 CGPA):** ${hn?.isPossible && trajectory.requiredSgpas.deansList_3_80.isPossible ? `Requires **${trajectory.requiredSgpas.deansList_3_80.requiredSgpa} SGPA**` : `Mathematically unreachable from current base (Max ceiling is **${maxCGPA.toFixed(2)}**)`}
- **First Class with Honors (3.75 CGPA):** ${hn?.isPossible ? `Requires **${hn.requiredSgpa} SGPA**` : `Mathematically unreachable (Max ceiling is **${maxCGPA.toFixed(2)}**)`}
- **First Class (3.00 CGPA):** ${fc?.isPossible ? `Requires **${fc.requiredSgpa} SGPA** in remaining credits` : `Max ceiling without retakes is **${maxCGPA.toFixed(2)}** — combine high SGPA in remaining terms with grade-improvement retakes`}
- **Second Class Upper Division (2.50 CGPA):** ${us?.isPossible ? (us.requiredSgpa <= 0 ? 'Already above threshold!' : `Requires **${us.requiredSgpa} SGPA** in remaining credits`) : `Requires grade improvement`}`;
    } else {
      deterministicReply = `### 🎓 Multivisional Academic Overview for **${student.name}** (\`${student.studentId}\`)

- **Current Standing:** **${currentCGPA.toFixed(2)} / 4.00 CGPA** (${trajectory.currentStanding}) across **${trajectory.completedSemestersCount} published semesters** (**${completedCredits} / ${trajectory.totalDegreeCredits} credits**)
- **Semester Progression:** ${(trajectory.semesterBreakdown || []).map((s) => `Sem ${s.semester}: **${s.sgpa.toFixed(2)}**`).join(' → ')}
- **Theory vs. Lab GPA:** Theory **${trajectory.theoryGpa.toFixed(2)}** (${trajectory.theoryCredits} Cr) vs. Sessional Lab **${trajectory.sessionalGpa.toFixed(2)}** (${trajectory.sessionalCredits} Cr)
- **8-Semester Forecast:** Projected Final CGPA **${projectedCGPA.toFixed(2)} / 4.00** (${standing}) • Max Ceiling: **${maxCGPA.toFixed(2)} / 4.00**

💡 **Ask me anything about your data or the website:**
- *"Tell me about Semester 6 result"* (or any Semester 1–8 for full course-by-course breakdown)
- *"Show all my semester results"* or *"Compare Semester 5 and Semester 6"*
- *"Tell me about CSE 3203"* (or any course code/title)
- *"Show my live routine, attendance, assignments, teachers, or notices"*`;
    }
  }

  // If this was a direct data lookup (like "tell me about semester 6 result", specific course, routine, attendance, assignments, teachers, notices, all semesters),
  // our deterministic multivisional report has 100% of the exact courses, marks, grades, and simulations!
  // Let's return it directly or, if it's an open-ended question and Gemini API key is configured, let Gemini answer with the full dataset!
  if (isExactDataMatch || !apiKey) {
    return { reply: deterministicReply, source: 'multivisional-advisor' };
  }

  // For open-ended conversational questions when GEMINI_API_KEY is available, provide the ENTIRE student transcript + website context to Gemini
  try {
    const fullSemContext = (trajectory.semesterBreakdown || []).map((s) => {
      const cList = (s.courses || []).map((c) => `${c.courseCode} (${c.courseTitle}, ${c.credits}cr): ${c.marks}/100 [Att:${c.attendanceMarks}/10, CA:${c.caMarks}, Final:${c.finalMarks}] -> ${c.grade} (${c.gradePoint})`).join('; ');
      return `Semester ${s.semester} (${s.label}): SGPA=${s.sgpa.toFixed(2)}, CGPA=${s.cgpa.toFixed(2)}, YGPA=${s.ygpa.toFixed(2)}, Credits=${s.earnedCredits}/${s.credits}, TheoryGPA=${s.theoryGpa}, LabGPA=${s.sessionalGpa} | Courses: ${cList}`;
    }).join('\n');

    const prompt = `You are the Official Multivisional Academic AI Advisor for the Department of Computer Science & Engineering (CSE) at Pabna University of Science and Technology (PUST).
Student: ${student.name} (ID: ${student.studentId}, Current Semester: ${student.currentSemester || student.semester || 7})
Question: "${qRaw}"

COMPLETE OFFICIAL ACADEMIC RECORD (SEMESTERS 1 TO ${trajectory.completedSemestersCount}):
- Overall CGPA: ${currentCGPA.toFixed(2)} / 4.00 (${trajectory.currentStanding})
- Completed Credits: ${completedCredits} / ${trajectory.totalDegreeCredits} (Remaining: ${remainingCredits} credits in ${remainingSemCount} semester(s))
- Theory GPA: ${trajectory.theoryGpa.toFixed(2)} | Sessional Lab GPA: ${trajectory.sessionalGpa.toFixed(2)}
- Total Attendance Marks Lost: ${trajectory.totalAttendanceMarksLost}
- Projected Final 8-Semester CGPA: ${projectedCGPA.toFixed(2)} (${standing}) | Max Ceiling: ${maxCGPA.toFixed(2)}
${fullSemContext}

LIVE WEBSITE DATA:
- Routine Slots: ${(websiteData.routineSummary || []).length} classes
- Active Assignments: ${(websiteData.assignmentsSummary || []).length}
- Department Teachers: ${(websiteData.teachersSummary || []).map((t) => `${t.name} (${t.designation})`).join(', ')}
- Recent Notices: ${(websiteData.noticesSummary || []).slice(0, 5).map((n) => n.title).join(' | ')}

BASELINE MULTIVISIONAL ANALYSIS:
${deterministicReply}

INSTRUCTIONS:
1. Provide a comprehensive, multi-dimensional ("multivisional") response using exact numbers, course codes, marks, and grades from the record above.
2. Never invent fake grades or falsely claim First Class if CGPA < 3.00.
3. Format cleanly with markdown headings (###) and bullet points.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const m of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(4000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3
            }
          })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 80) {
          return { reply: text.trim(), source: 'ai-advisor' };
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[AI Advisor] Gemini Chat fallback:', err.message);
  }

  return { reply: deterministicReply, source: 'multivisional-advisor' };
}

/**
 * Generates dynamic, varied English guidance messages every time requested
 */
async function generateDynamicEnglishGuidance(student, trajectory, variation = 0) {
  const currentCGPA = trajectory.currentCGPA;
  const projectedCGPA = trajectory.projectedFinalCGPA;
  const maxCGPA = trajectory.maxAchievableCGPA;
  const standing = trajectory.projectedStanding || getAcademicStandingCategory(projectedCGPA);

  const fallbackTemplates = [
    `🎓 1. Final 8-Semester Degree Forecast:
Based on your official record of ${trajectory.completedCredits} credits across ${trajectory.completedSemestersCount} published semesters, your current CGPA is ${currentCGPA.toFixed(2)} / 4.00 and your projected graduation CGPA is ${projectedCGPA.toFixed(2)} / 4.00 (${standing}). Your maximum mathematical ceiling stands at ${maxCGPA.toFixed(2)}.

📋 2. Actionable Improvement Plan:
• [Continuous Assessment Lock-In]: Maintain strict ≥90% attendance in lectures and labs to secure the full 10/10 attendance marks (you previously lost ${trajectory.totalAttendanceMarksLost} marks due to <90% attendance).
• [High-Credit Theory Mastery]: Prioritize 3.0-credit core theory courses (Theory GPA: ${trajectory.theoryGpa.toFixed(2)} vs Lab GPA: ${trajectory.sessionalGpa.toFixed(2)}); these carry double the weight of practical labs.
• [Senior Thesis & Capstone Execution]: For Thesis (CSE 4100 & CSE 4200, 4.5 credits total), consistent weekly research milestones with your supervisor will lock in top defense marks.

⚠️ 3. Critical Mistakes to Avoid:
• Mistake 1: Letting class attendance drop into the 60–69% range, which forfeits 5 free marks per course under PUST Ordinance Sec 20.8 (iv).
• Mistake 2: Entering 70-mark final written exams with low Class Test / CA marks (< 12/20).
• Mistake 3: Delaying thesis documentation or software testing until the final weeks before defense.`,

    `🎓 1. Graduation Trajectory & Multivisional Standing:
Reviewing your ${trajectory.completedSemestersCount} completed semesters (peak SGPA ${trajectory.bestSemester?.sgpa.toFixed(2) || currentCGPA.toFixed(2)} in Semester ${trajectory.bestSemester?.semester || 1}), your trajectory points toward a final CGPA of ${projectedCGPA.toFixed(2)} / 4.00 (${standing}), with an absolute ceiling of ${maxCGPA.toFixed(2)}.

📋 2. Strategic Performance Roadmap:
• [Theory Exam Preparation]: Dedicate structured weekly hours to 3.0-credit theory papers to close the gap between your Theory GPA (${trajectory.theoryGpa.toFixed(2)}) and Lab GPA (${trajectory.sessionalGpa.toFixed(2)}).
• [Full Attendance Cushion]: Target ≥90% presence in all classes to guarantee 10/10 continuous assessment marks.
• [Capstone Excellence]: Treat your 4th-year Thesis & Project courses as high-leverage opportunities to boost your cumulative grade points.

⚠️ 3. Essential Pitfalls to Avoid:
• Pitfall 1: Missing classes and forfeiting free attendance marks that easily elevate a D/C grade to B-/B.
• Pitfall 2: Spending equal study time on 0.75-credit sessionals and 3.0-credit core theory courses.
• Pitfall 3: Postponing supervisor reviews for your senior thesis.`
  ];

  const templateIndex = Math.abs(Number(variation) || 0) % fallbackTemplates.length;
  return { text: fallbackTemplates[templateIndex], source: 'multivisional-advisor', variation: templateIndex };
}

module.exports = {
  TOTAL_DEGREE_CREDITS,
  getAcademicStandingCategory,
  calculateAcademicTrajectory,
  fetchWebsiteLearningContext,
  generateRuleBasedAdvisor,
  generateAIEvaluation,
  answerAcademicQuestion,
  generateDynamicEnglishGuidance,
  extractRequestedSemesters,
  buildSemesterMultivisionalReport
};
