'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { requireStudent, requireAdmin, noStore } = require('../middleware/roles');
const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');
const { adminEmails } = require('../config/attendance');
const { calculateAcademicTrajectory, generateAIEvaluation, answerAcademicQuestion, generateDynamicEnglishGuidance } = require('../services/aiAdvisor.service');

const router = express.Router();
router.use(noStore);

// ── GRADE POINT HELPERS ───────────────────────────────────────────
const GRADE_SCALE = [
  { minMarks: 80, grade: 'A+', gradePoint: 4.00, remark: 'Outstanding' },
  { minMarks: 75, grade: 'A',  gradePoint: 3.75, remark: 'Excellent' },
  { minMarks: 70, grade: 'A-', gradePoint: 3.50, remark: 'Very Good' },
  { minMarks: 65, grade: 'B+', gradePoint: 3.25, remark: 'Good' },
  { minMarks: 60, grade: 'B',  gradePoint: 3.00, remark: 'Satisfactory' },
  { minMarks: 55, grade: 'B-', gradePoint: 2.75, remark: 'Below Satisfactory' },
  { minMarks: 50, grade: 'C+', gradePoint: 2.50, remark: 'Average' },
  { minMarks: 45, grade: 'C',  gradePoint: 2.25, remark: 'Pass' },
  { minMarks: 40, grade: 'D',  gradePoint: 2.00, remark: 'Poor' },
  { minMarks: 0,  grade: 'F',  gradePoint: 0.00, remark: 'Fail' },
];

function getGradeFromMarks(marks) {
  const m = Number(marks);
  if (!Number.isFinite(m)) return null;
  for (const item of GRADE_SCALE) {
    if (m >= item.minMarks) {
      return item;
    }
  }
  return { grade: 'F', gradePoint: 0.00, remark: 'Fail' };
}

function getGradePointFromLetter(letter) {
  const norm = String(letter || '').trim().toUpperCase();
  const match = GRADE_SCALE.find((s) => s.grade === norm);
  return match ? match.gradePoint : 0.00;
}

function getAcademicStanding(cgpa) {
  const val = Number(cgpa) || 0;
  if (val >= 3.80) return "Dean's List / First Class with Honors (Outstanding)";
  if (val >= 3.75) return 'First Class with Honors (Outstanding)';
  if (val >= 3.00) return 'First Class (Excellent)';
  if (val >= 2.50) return 'Second Class (Upper Division)';
  if (val >= 2.25) return 'Second Class (Lower Division)';
  if (val >= 2.00) return 'Pass (Third Class)';
  return 'Academic Warning / Unsatisfactory';
}

function getCourseType(courseCode, courseTitle) {
  const normTitle = String(courseTitle || '').toLowerCase();
  const normCode = String(courseCode || '').toLowerCase();
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
  return 'theory';
}

// Attendance marks based on percentage (PUST Ordinance Sec 20.8 iv)
// 90% and above -> 10, 85% to <90% -> 9, 80% to <85% -> 8, 75% to <80% -> 7, 70% to <75% -> 6, 60% to <70% -> 5, <60% -> 0
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

function calculateSemesterMetrics(courses = []) {
  let totalCredits = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;

  const sanitizedCourses = courses.map((c) => {
    const credits = Number(c.credits) || 0;
    const courseType = c.courseType || getCourseType(c.courseCode, c.courseTitle);

    // Continuous assessment criteria (PUST Ordinance Image 2, 3, 5)
    // 1. Attendance
    const attendancePercentage = c.attendancePercentage !== undefined && c.attendancePercentage !== null && c.attendancePercentage !== ''
      ? Number(c.attendancePercentage)
      : null;

    let attendanceMarks = c.attendanceMarks !== undefined && c.attendanceMarks !== null && c.attendanceMarks !== ''
      ? Number(c.attendanceMarks)
      : null;

    if (attendanceMarks === null && attendancePercentage !== null) {
      attendanceMarks = calcAttendanceMarks(attendancePercentage);
    }

    // 2. Continuous Assessment (CA) / Class tests & assignments (Max 20 for theory, 30 for sessional)
    const caMarks = c.caMarks !== undefined && c.caMarks !== null && c.caMarks !== ''
      ? Number(c.caMarks)
      : (c.continuousMarks !== undefined && c.continuousMarks !== null && c.continuousMarks !== '' ? Number(c.continuousMarks) : null);

    // 3. Semester Final Exam (Max 70 for theory, 60 for sessional)
    const finalMarks = c.finalMarks !== undefined && c.finalMarks !== null && c.finalMarks !== ''
      ? Number(c.finalMarks)
      : null;

    // Total Marks calculation
    let totalMarks = c.marks !== undefined && c.marks !== null && c.marks !== ''
      ? Number(c.marks)
      : null;

    // If totalMarks wasn't entered directly, derive it from criteria: Att + CA + Final
    if (totalMarks === null && (attendanceMarks !== null || caMarks !== null || finalMarks !== null)) {
      totalMarks = Number(((attendanceMarks || 0) + (caMarks || 0) + (finalMarks || 0)).toFixed(1));
    }

    let grade = 'F';
    let gradePoint = 0.00;

    // AUTO-FIXED GRADE: Grade is strictly determined from Total Marks (PUST 10-tier scale)
    if (totalMarks !== null && !isNaN(totalMarks)) {
      const scaleMatch = getGradeFromMarks(totalMarks);
      if (scaleMatch) {
        grade = scaleMatch.grade;
        gradePoint = scaleMatch.gradePoint;
      }
    } else if (c.grade) {
      grade = String(c.grade).trim().toUpperCase();
      gradePoint = getGradePointFromLetter(grade);
    }

    const isPassed = grade !== 'F' && gradePoint > 0;
    totalCredits += credits;
    if (isPassed) {
      earnedCredits += credits;
    }
    const creditPoints = Number((credits * gradePoint).toFixed(4));
    totalGradePoints += creditPoints;

    return {
      courseCode: String(c.courseCode || '').trim().toUpperCase(),
      courseTitle: String(c.courseTitle || '').trim(),
      courseType,
      credits,
      attendancePercentage,
      attendanceMarks,
      caMarks,
      continuousMarks: caMarks,
      finalMarks,
      marks: totalMarks,
      grade,
      gradePoint: Number(gradePoint.toFixed(2)),
      creditPoints: Number((credits * gradePoint).toFixed(2)), // C_i * G_i as in Equation (I)
      status: isPassed ? 'passed' : 'failed',
    };
  });

  // Equation (I): GPA = (Σ C_i * G_i) / (Σ C_i)
  const sgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.00;
  const sgpaExact = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(3)) : 0.000;

  return {
    courses: sanitizedCourses,
    totalCredits: Number(totalCredits.toFixed(2)),
    earnedCredits: Number(earnedCredits.toFixed(2)),
    totalGradePoints: Number(totalGradePoints.toFixed(2)),
    sgpa,
    sgpaExact,
  };
}

// Recalculate GPA, YGPA (Yearly GPA) and CGPA chronologically across all semesters (Equations I, II, III)
async function recalculateStudentCGPA(studentId) {
  const { results } = getCollections();
  if (!results) return;

  const list = await results
    .find({ studentId: String(studentId).trim() })
    .sort({ semester: 1 })
    .toArray();

  let cumulativePoints = 0;
  let cumulativeCredits = 0;
  let cumulativeEarnedCredits = 0;

  // Pre-calculate semester metrics for fast lookup
  const semMetricsMap = new Map();
  list.forEach((item) => {
    semMetricsMap.set(item.semester, calculateSemesterMetrics(item.courses || []));
  });

  for (const item of list) {
    const semMetrics = semMetricsMap.get(item.semester) || calculateSemesterMetrics(item.courses || []);
    cumulativePoints += semMetrics.totalGradePoints;
    cumulativeCredits += semMetrics.totalCredits;
    cumulativeEarnedCredits += semMetrics.earnedCredits;

    // Equation (III): CGPA = (Σ C_k * G_k) / (Σ C_k)
    const runningCgpa = cumulativeCredits > 0
      ? Number((cumulativePoints / cumulativeCredits).toFixed(2))
      : semMetrics.sgpa;
    const runningCgpaExact = cumulativeCredits > 0
      ? Number((cumulativePoints / cumulativeCredits).toFixed(3))
      : semMetrics.sgpaExact;

    // Equation (II): YGPA for the academic year (Year 1: Sem 1 & 2; Year 2: Sem 3 & 4; Year 3: Sem 5 & 6; Year 4: Sem 7 & 8)
    const academicYearNum = Math.ceil(item.semester / 2);
    const oddSemNum = (academicYearNum - 1) * 2 + 1;
    const evenSemNum = academicYearNum * 2;

    let ygpa = semMetrics.sgpa;
    if (semMetricsMap.has(oddSemNum) && semMetricsMap.has(evenSemNum)) {
      const odd = semMetricsMap.get(oddSemNum);
      const even = semMetricsMap.get(evenSemNum);
      const yearCredits = odd.totalCredits + even.totalCredits;
      const yearPoints = odd.totalGradePoints + even.totalGradePoints;
      ygpa = yearCredits > 0 ? Number((yearPoints / yearCredits).toFixed(2)) : semMetrics.sgpa;
    }

    const academicStanding = getAcademicStanding(runningCgpa);
    const isDeansList = runningCgpa >= 3.80; // Section 20.9 Dean's List (CGPA >= 3.80)

    await results.updateOne(
      { _id: item._id },
      {
        $set: {
          courses: semMetrics.courses,
          totalCredits: semMetrics.totalCredits,
          earnedCredits: semMetrics.earnedCredits,
          totalGradePoints: semMetrics.totalGradePoints,
          sgpa: semMetrics.sgpa,
          sgpaExact: semMetrics.sgpaExact,
          academicYear: academicYearNum,
          ygpa,
          cgpa: runningCgpa,
          cgpaExact: runningCgpaExact,
          isDeansList,
          academicStanding,
          cumulativeEarnedCredits: Number(cumulativeEarnedCredits.toFixed(2)),
          updatedAt: new Date(),
        },
      }
    );
  }
}

// Helper to check admin permission
function checkIsAdmin(req) {
  const email = String(req.user?.email || '').trim().toLowerCase();
  return req.user?.role === 'admin' || adminEmails.includes(email);
}

// ── GET /api/results/student/my-results ────────────────────────────
// Student can view published results of all prior semesters (e.g. if Sem 7 -> Semesters 1 to 6)
router.get('/student/my-results', verifyToken, async (req, res) => {
  try {
    const { students, results } = getCollections();
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userId = req.user?.sub ? String(req.user.sub) : null;
    const isAdmin = checkIsAdmin(req);

    let student = null;
    if (isAdmin && req.query.studentId) {
      student = await students.findOne({ studentId: String(req.query.studentId).trim() });
    }

    if (!student) {
      student = await students.findOne({
        $or: [
          { email: { $in: [userEmail, (req.user?.email || '').trim()] } },
          ...(userId ? [{ userId }] : []),
        ],
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'No student profile linked to this account.', code: 'STUDENT_NOT_FOUND' });
    }

    const rawSemester = String(student.semester || '7');
    const semDigits = rawSemester.replace(/\D/g, '');
    const currentSemNum = semDigits ? parseInt(semDigits, 10) : 7;

    // Student rule: if student is in semester N, view all results of early semesters (1 to N-1).
    // Also include semester N if admin has already officially published it.
    const query = {
      $or: [
        { studentEmail: student.email.toLowerCase() },
        { studentId: String(student.studentId).trim() },
      ],
      status: 'published',
      semester: { $lte: currentSemNum },
    };

    const studentResults = await results.find(query).sort({ semester: 1 }).toArray();

    // Prior early semesters that student is entitled to view
    const earlySemesters = [];
    for (let s = 1; s < currentSemNum; s++) {
      earlySemesters.push(s);
    }

    // Compute overall cumulative totals
    let totalGradePoints = 0;
    let totalCredits = 0;
    let totalCreditsEarned = 0;
    let totalCoursesPassed = 0;

    studentResults.forEach((sem) => {
      (sem.courses || []).forEach((c) => {
        const cr = Number(c.credits) || 0;
        const gp = Number(c.gradePoint) || 0;
        totalCredits += cr;
        totalGradePoints += cr * gp;
        if (c.grade !== 'F' && gp > 0) {
          totalCreditsEarned += cr;
          totalCoursesPassed++;
        }
      });
    });

    const overallCGPA = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.00;
    const academicStanding = getAcademicStanding(overallCGPA);

    res.json({
      success: true,
      student: {
        id: String(student._id),
        name: student.name,
        studentId: student.studentId,
        email: student.email,
        semester: student.semester,
        currentSemester: currentSemNum,
        batch: student.batch,
        shift: student.shift || 'Day',
        department: 'Computer Science and Engineering',
        institution: 'Pabna University of Science and Technology',
      },
      currentSemester: currentSemNum,
      earlySemesters,
      overallCGPA,
      totalCreditsCompleted: Number(totalCreditsEarned.toFixed(2)),
      totalCreditsAttempted: Number(totalCredits.toFixed(2)),
      totalGradePoints: Number(totalGradePoints.toFixed(2)),
      totalCoursesPassed,
      academicStanding,
      isDeansList: overallCGPA >= 3.80, // Section 20.9 Dean's List
      resultsCount: studentResults.length,
      results: studentResults.map((r) => ({
        id: String(r._id),
        studentId: r.studentId,
        studentName: r.studentName,
        semester: r.semester,
        semesterLabel: r.semesterLabel || SEMESTER_LABELS[r.semester] || `${r.semester}th Semester`,
        session: r.session || '2022-2023',
        examYear: r.examYear || (2020 + r.semester),
        totalCredits: r.totalCredits,
        earnedCredits: r.earnedCredits,
        totalGradePoints: r.totalGradePoints !== undefined ? r.totalGradePoints : Number((r.courses || []).reduce((sum, c) => sum + ((Number(c.credits) || 0) * (Number(c.gradePoint) || 0)), 0).toFixed(2)),
        sgpa: r.sgpa,
        sgpaExact: r.sgpaExact,
        academicYear: r.academicYear || Math.ceil(r.semester / 2),
        ygpa: r.ygpa,
        cgpa: r.cgpa,
        cgpaExact: r.cgpaExact,
        isDeansList: r.isDeansList !== undefined ? r.isDeansList : (r.cgpa >= 3.80),
        academicStanding: r.academicStanding || getAcademicStanding(r.cgpa),
        remarks: r.remarks || '',
        publishedDate: r.publishedDate || r.createdAt,
        courses: r.courses || [],
      })),
    });
  } catch (err) {
    console.error('Error fetching student results:', err);
    res.status(500).json({ error: 'Failed to retrieve academic results.' });
  }
});

// ── GET /api/results/student/ai-forecast ───────────────────────────
// AI Academic Graduation Forecast & Performance Coach (Credit Trajectory + Gemini AI)
router.get('/student/ai-forecast', verifyToken, async (req, res) => {
  try {
    const { students, results } = getCollections();
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userId = req.user?.sub ? String(req.user.sub) : null;
    const isAdmin = checkIsAdmin(req);

    let student = null;
    if (isAdmin && req.query.studentId) {
      student = await students.findOne({ studentId: String(req.query.studentId).trim() });
    }

    if (!student) {
      student = await students.findOne({
        $or: [
          { email: { $in: [userEmail, (req.user?.email || '').trim()] } },
          ...(userId ? [{ userId }] : []),
        ],
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'No student profile linked to this account.', code: 'STUDENT_NOT_FOUND' });
    }

    const rawSemester = String(student.semester || '7');
    const semDigits = rawSemester.replace(/\D/g, '');
    const currentSemNum = semDigits ? parseInt(semDigits, 10) : 7;

    const query = {
      $or: [
        { studentEmail: student.email.toLowerCase() },
        { studentId: String(student.studentId).trim() },
      ],
      status: 'published',
      semester: { $lte: currentSemNum },
    };

    const studentResults = await results.find(query).sort({ semester: 1 }).toArray();

    // Calculate deterministic trajectory
    const trajectory = calculateAcademicTrajectory(studentResults, currentSemNum);

    // Generate AI evaluation and improvement advice
    const aiEvaluation = await generateAIEvaluation(student, trajectory);

    res.json({
      success: true,
      student: {
        id: String(student._id),
        name: student.name,
        studentId: student.studentId,
        semester: student.semester,
        currentSemester: currentSemNum,
        session: student.session || '2021-2022',
        batch: student.batch
      },
      trajectory,
      aiEvaluation
    });
  } catch (err) {
    console.error('Error generating AI forecast:', err);
    res.status(500).json({ error: 'Failed to generate academic forecast.' });
  }
});

// ── POST /api/results/student/ai-coach-chat ─────────────────────────
// Interactive real-time Q&A with AI Academic Advisor
router.post('/student/ai-coach-chat', verifyToken, async (req, res) => {
  try {
    const { students, results } = getCollections();
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userId = req.user?.sub ? String(req.user.sub) : null;
    const isAdmin = checkIsAdmin(req);
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (_) {}
    }
    const { question, studentId } = payload;

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    let student = null;
    if (isAdmin && studentId) {
      student = await students.findOne({ studentId: String(studentId).trim() });
    }

    if (!student) {
      student = await students.findOne({
        $or: [
          { email: { $in: [userEmail, (req.user?.email || '').trim()] } },
          ...(userId ? [{ userId }] : []),
        ],
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const rawSemester = String(student.semester || '7');
    const semDigits = rawSemester.replace(/\D/g, '');
    const currentSemNum = semDigits ? parseInt(semDigits, 10) : 7;

    const query = {
      $or: [
        { studentEmail: student.email.toLowerCase() },
        { studentId: String(student.studentId).trim() },
      ],
      status: 'published',
      semester: { $lte: currentSemNum },
    };

    const studentResults = await results.find(query).sort({ semester: 1 }).toArray();
    const trajectory = calculateAcademicTrajectory(studentResults, currentSemNum);
    const answer = await answerAcademicQuestion(student, trajectory, String(question).trim());

    res.json({
      success: true,
      question: String(question).trim(),
      reply: answer.reply,
      source: answer.source,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in AI Coach chat:', err);
    res.status(500).json({ error: 'Failed to process AI inquiry.' });
  }
});

// ── POST /api/results/student/generate-guidance ─────────────────────
// Generates fresh, uniquely phrased English academic guidance on every invocation
router.post('/student/generate-guidance', verifyToken, async (req, res) => {
  try {
    const { students, results } = getCollections();
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userId = req.user?.sub ? String(req.user.sub) : null;
    const isAdmin = checkIsAdmin(req);

    let payload = req.body || {};
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (_) {}
    }
    const { studentId, variation = 0 } = payload;

    let student = null;
    if (isAdmin && studentId) {
      student = await students.findOne({ studentId: String(studentId).trim() });
    }

    if (!student) {
      student = await students.findOne({
        $or: [
          { email: { $in: [userEmail, (req.user?.email || '').trim()] } },
          ...(userId ? [{ userId }] : []),
        ],
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const rawSemester = String(student.semester || '7');
    const semDigits = rawSemester.replace(/\D/g, '');
    const currentSemNum = semDigits ? parseInt(semDigits, 10) : 7;

    const query = {
      $or: [
        { studentEmail: student.email.toLowerCase() },
        { studentId: String(student.studentId).trim() },
      ],
      status: 'published',
      semester: { $lte: currentSemNum },
    };

    const studentResults = await results.find(query).sort({ semester: 1 }).toArray();
    const trajectory = calculateAcademicTrajectory(studentResults, currentSemNum);
    const guidance = await generateDynamicEnglishGuidance(student, trajectory, variation);

    res.json({
      success: true,
      text: guidance.text,
      source: guidance.source,
      variation: guidance.variation,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating dynamic guidance:', err);
    res.status(500).json({ error: 'Failed to generate guidance message.' });
  }
});

// ── GET /api/results/admin/courses-template ───────────────────────
// Fetch standard curriculum courses for a given semester to auto-populate result entry form
router.get('/admin/courses-template', verifyToken, async (req, res) => {
  try {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
    }

    const semester = parseInt(req.query.semester, 10) || 1;
    const list = SEMESTER_COURSES[semester] || [];
    const label = SEMESTER_LABELS[semester] || `${semester}th Semester`;

    const courses = list.map((c) => ({
      courseCode: c.code,
      courseTitle: c.title,
      credits: c.credits,
      marks: '',
      grade: 'A',
      gradePoint: 3.75,
      status: 'passed',
    }));

    res.json({
      success: true,
      semester,
      semesterLabel: label,
      courses,
      totalCredits: courses.reduce((sum, c) => sum + c.credits, 0),
    });
  } catch (err) {
    console.error('Error fetching course template:', err);
    res.status(500).json({ error: 'Failed to fetch course template' });
  }
});

// ── GET /api/results/admin/student-ca-metrics ──────────────────────
// Auto-fetch continuous assessment (CA) marks and attendance percentage for a student in a semester
router.get('/admin/student-ca-metrics', verifyToken, async (req, res) => {
  try {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
    }

    const { studentId, semester } = req.query;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId query param is required' });
    }

    const semNum = parseInt(semester, 10) || 1;
    const { students, attendanceSessions, attendanceRecords, classTests, assignmentSubmissions } = getCollections();

    const cleanStudentId = String(studentId).trim();
    const student = await students.findOne({
      $or: [
        { studentId: cleanStudentId },
        { studentId: Number(cleanStudentId) || -1 },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const list = SEMESTER_COURSES[semNum] || [];

    const coursesMetrics = await Promise.all(
      list.map(async (c) => {
        const courseCode = c.code.trim();
        const courseType = getCourseType(c.code, c.title);
        const maxCaMarks = courseType === 'sessional' ? 30 : 20;
        const maxFinalMarks = courseType === 'sessional' ? 60 : 70;

        // 1. Attendance percentage & Marks (PUST Ordinance Section 20.8 iv)
        const sessions = await attendanceSessions.find({
          courseCode: new RegExp(`^${courseCode.replace(/\s+/g, '\\s*')}$`, 'i'),
        }).toArray();

        const records = await attendanceRecords.find({
          studentId: cleanStudentId,
          courseCode: new RegExp(`^${courseCode.replace(/\s+/g, '\\s*')}$`, 'i'),
          status: 'present',
        }).toArray();

        const totalSessions = sessions.length;
        const presentSessions = records.length;
        const attPct = totalSessions > 0 ? Math.min(100, Math.round((presentSessions / totalSessions) * 100)) : 100;
        const attMarks = calcAttendanceMarks(attPct);

        // 2. Class tests & assignments (Teacher CA)
        const tests = await classTests.find({
          courseCode: new RegExp(`^${courseCode.replace(/\s+/g, '\\s*')}$`, 'i'),
          'marks.studentId': cleanStudentId,
        }).toArray();

        const testMarks = tests.map((t) => {
          const entry = (t.marks || []).find((m) => String(m.studentId).trim() === cleanStudentId);
          return {
            title: t.title,
            maxMarks: t.totalMarks || 10,
            marks: entry ? entry.marks : 0,
          };
        });

        const subs = await assignmentSubmissions.find({
          studentId: cleanStudentId,
          courseCode: new RegExp(`^${courseCode.replace(/\s+/g, '\\s*')}$`, 'i'),
          status: 'graded',
        }).toArray();

        const assignmentMarks = subs.map((s) => ({
          title: s.title || 'Assignment',
          marks: s.marks || 0,
        }));

        // Compute CA from best tests and assignments
        let computedCaMarks = null;
        if (testMarks.length > 0 || assignmentMarks.length > 0) {
          if (courseType === 'theory') {
            const sortedTests = [...testMarks].sort((a, b) => b.marks - a.marks);
            const bestTwo = sortedTests.slice(0, 2);
            const bestSum = bestTwo.reduce((s, t) => s + t.marks, 0);
            const bestMax = bestTwo.reduce((s, t) => s + t.maxMarks, 0);
            computedCaMarks = bestMax > 0 ? Number(((bestSum / bestMax) * 20).toFixed(1)) : null;
          } else {
            let totalGot = 0;
            let totalMax = 0;
            testMarks.forEach((t) => {
              totalGot += t.marks;
              totalMax += t.maxMarks;
            });
            assignmentMarks.forEach((a) => {
              totalGot += a.marks;
              totalMax += 10;
            });
            computedCaMarks = totalMax > 0 ? Number(((totalGot / totalMax) * 30).toFixed(1)) : 25;
          }
        }

        return {
          courseCode: c.code,
          courseTitle: c.title,
          credits: c.credits,
          courseType,
          attendanceSessionsHeld: totalSessions,
          attendanceSessionsPresent: presentSessions,
          attendancePercentage: attPct,
          attendanceMarks: attMarks,
          maxCaMarks,
          caMarks: computedCaMarks,
          maxFinalMarks,
          finalMarks: null,
          marks: null,
        };
      })
    );

    res.json({
      success: true,
      studentId: cleanStudentId,
      studentName: student.name,
      semester: semNum,
      courses: coursesMetrics,
    });
  } catch (err) {
    console.error('Error fetching student CA metrics:', err);
    res.status(500).json({ error: 'Failed to fetch student CA & attendance metrics' });
  }
});

// ── GET /api/results/admin/list ───────────────────────────────────
// Admin lists all student semester results with search and filtering
router.get('/admin/list', verifyToken, async (req, res) => {
  try {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
    }

    const { results, students } = getCollections();
    const { semester, session, search, studentId } = req.query;

    const query = {};
    if (session && session !== 'all') {
      query.session = String(session).trim();
    }
    if (semester && semester !== 'all') {
      query.semester = Number(semester);
    }
    if (studentId) {
      query.studentId = String(studentId).trim();
    }
    if (search) {
      const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { studentId: searchRegex },
        { studentName: searchRegex },
        { studentEmail: searchRegex },
      ];
    }

    const list = await results.find(query).sort({ semester: 1, studentId: 1 }).toArray();

    // Also fetch students list with their session and batch
    const allStudents = await students
      .find({ status: { $ne: 'rejected' } }, { projection: { studentId: 1, name: 1, email: 1, semester: 1, session: 1, batch: 1 } })
      .sort({ studentId: 1 })
      .toArray();

    // Dynamically summarize all available sessions and the current semester reached by each session
    const sessionsMap = new Map();
    allStudents.forEach((st) => {
      const sess = String(st.session || '').trim();
      if (!sess) return;
      const rawSem = String(st.semester || '');
      const semDigits = rawSem.replace(/\D/g, '');
      const semNum = semDigits ? parseInt(semDigits, 10) : 1;

      if (!sessionsMap.has(sess)) {
        sessionsMap.set(sess, {
          session: sess,
          batch: st.batch || '',
          currentSemester: semNum,
          studentsCount: 0,
        });
      }
      const entry = sessionsMap.get(sess);
      entry.studentsCount++;
      if (semNum > entry.currentSemester) {
        entry.currentSemester = semNum;
      }
      if (st.batch && !entry.batch) {
        entry.batch = st.batch;
      }
    });

    const sessionsList = Array.from(sessionsMap.values()).sort((a, b) => {
      return b.session.localeCompare(a.session);
    });

    res.json({
      success: true,
      count: list.length,
      sessions: sessionsList,
      results: list.map((r) => ({
        id: String(r._id),
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        semester: r.semester,
        semesterLabel: r.semesterLabel || SEMESTER_LABELS[r.semester] || `${r.semester}th Semester`,
        session: r.session,
        examYear: r.examYear,
        totalCredits: r.totalCredits,
        earnedCredits: r.earnedCredits,
        totalGradePoints: r.totalGradePoints !== undefined ? r.totalGradePoints : Number((r.courses || []).reduce((sum, c) => sum + ((Number(c.credits) || 0) * (Number(c.gradePoint) || 0)), 0).toFixed(2)),
        sgpa: r.sgpa,
        sgpaExact: r.sgpaExact,
        academicYear: r.academicYear || Math.ceil(r.semester / 2),
        ygpa: r.ygpa,
        cgpa: r.cgpa,
        cgpaExact: r.cgpaExact,
        isDeansList: r.isDeansList !== undefined ? r.isDeansList : (r.cgpa >= 3.80),
        academicStanding: r.academicStanding || getAcademicStanding(r.cgpa),
        coursesCount: (r.courses || []).length,
        status: r.status || 'published',
        publishedDate: r.publishedDate || r.createdAt,
        updatedAt: r.updatedAt,
      })),
      students: allStudents,
    });
  } catch (err) {
    console.error('Error fetching admin results list:', err);
    res.status(500).json({ error: 'Failed to fetch results list.' });
  }
});

// ── GET /api/results/admin/student/:studentId ─────────────────────
// Admin gets all semester records for a specific student
router.get('/admin/student/:studentId', verifyToken, async (req, res) => {
  try {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
    }

    const { results, students } = getCollections();
    const studentId = String(req.params.studentId).trim();

    const student = await students.findOne({
      $or: [{ studentId }, { studentId: Number(studentId) }],
    });

    const studentResults = await results.find({ studentId }).sort({ semester: 1 }).toArray();

    res.json({
      success: true,
      student,
      results: studentResults,
    });
  } catch (err) {
    console.error('Error fetching student results for admin:', err);
    res.status(500).json({ error: 'Failed to fetch student results' });
  }
});

// ── POST /api/results/admin/save ──────────────────────────────────
// Admin fills or edits a semester result
router.post('/admin/save', verifyToken, async (req, res) => {
  try {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: 'Administrator access required. Only admins can fill or edit results.', code: 'FORBIDDEN' });
    }

    const { results, students } = getCollections();
    const {
      studentId,
      studentEmail,
      studentName,
      semester,
      session,
      examYear,
      courses,
      remarks,
      status,
    } = req.body || {};

    if (!studentId || !semester) {
      return res.status(400).json({ error: 'Student ID and semester are required.' });
    }

    const cleanStudentId = String(studentId).trim();
    const semNum = Number(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return res.status(400).json({ error: 'Semester must be between 1 and 8.' });
    }

    // Look up student details to ensure consistency
    const stDoc = await students.findOne({
      $or: [
        { studentId: cleanStudentId },
        { studentId: Number(cleanStudentId) || -1 },
        ...(studentEmail ? [{ email: studentEmail.toLowerCase() }] : []),
      ],
    });

    const officialName = studentName || stDoc?.name || 'Department Student';
    const officialEmail = (studentEmail || stDoc?.email || '').toLowerCase();
    const currentSemNum = stDoc?.semester ? parseInt(String(stDoc.semester).replace(/\D/g, ''), 10) : semNum;

    const metrics = calculateSemesterMetrics(courses || []);
    const now = new Date();
    const semLabel = SEMESTER_LABELS[semNum] || `${semNum}th Semester`;

    const docToSave = {
      studentId: cleanStudentId,
      studentEmail: officialEmail,
      studentName: officialName,
      currentSemester: currentSemNum,
      semester: semNum,
      semesterLabel: semLabel,
      session: session || stDoc?.session || '2022-2023',
      examYear: examYear ? Number(examYear) : now.getFullYear(),
      courses: metrics.courses,
      totalCredits: metrics.totalCredits,
      earnedCredits: metrics.earnedCredits,
      sgpa: metrics.sgpa,
      remarks: remarks || '',
      status: status || 'published',
      publishedDate: status === 'draft' ? null : now,
      updatedBy: req.user?.email || 'admin@cse.edu',
      updatedAt: now,
    };

    const updateRes = await results.findOneAndUpdate(
      { studentId: cleanStudentId, semester: semNum },
      {
        $set: docToSave,
        $setOnInsert: {
          createdBy: req.user?.email || 'admin@cse.edu',
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Recalculate CGPA across all completed semesters for this student
    await recalculateStudentCGPA(cleanStudentId);

    const updatedDoc = await results.findOne({ studentId: cleanStudentId, semester: semNum });

    res.json({
      success: true,
      message: `Result for Semester ${semNum} successfully saved for ${officialName} (${cleanStudentId})!`,
      result: updatedDoc || updateRes,
    });
  } catch (err) {
    console.error('Error saving semester result:', err);
    res.status(500).json({ error: 'Failed to save semester result.' });
  }
});

// ── DELETE /api/results/admin/:id ─────────────────────────────────
// Admin deletes a semester result
router.delete('/admin/:id', verifyToken, async (req, res) => {
  try {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
    }

    const { results } = getCollections();
    const resultId = req.params.id;

    const existing = await results.findOne({
      $or: [
        { _id: ObjectId.isValid(resultId) ? new ObjectId(resultId) : null },
        { _id: resultId },
      ],
    });

    if (!existing) {
      return res.status(404).json({ error: 'Result document not found.' });
    }

    await results.deleteOne({ _id: existing._id });

    // Recalculate CGPA for remaining semesters of this student
    if (existing.studentId) {
      await recalculateStudentCGPA(existing.studentId);
    }

    res.json({
      success: true,
      message: `Semester ${existing.semester} result for ${existing.studentName} deleted successfully.`,
    });
  } catch (err) {
    console.error('Error deleting result:', err);
    res.status(500).json({ error: 'Failed to delete semester result.' });
  }
});

router.calculateSemesterMetrics = calculateSemesterMetrics;
router.recalculateStudentCGPA = recalculateStudentCGPA;
router.GRADE_SCALE = GRADE_SCALE;
router.getAcademicStanding = getAcademicStanding;

module.exports = router;
