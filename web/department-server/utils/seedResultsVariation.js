'use strict';

const { getCollections } = require('../config/db');
const { SEMESTER_COURSES, SEMESTER_LABELS } = require('../data/courses');

// Official PUST grading helper
function calcGradeAndPoint(totalMarks) {
  const m = Number(totalMarks);
  if (isNaN(m) || m < 40) return { grade: 'F', gradePoint: 0.00, remark: 'Fail' };
  if (m >= 80) return { grade: 'A+', gradePoint: 4.00, remark: 'Outstanding' };
  if (m >= 75) return { grade: 'A',  gradePoint: 3.75, remark: 'Excellent' };
  if (m >= 70) return { grade: 'A-', gradePoint: 3.50, remark: 'Very Good' };
  if (m >= 65) return { grade: 'B+', gradePoint: 3.25, remark: 'Good' };
  if (m >= 60) return { grade: 'B',  gradePoint: 3.00, remark: 'Satisfactory' };
  if (m >= 55) return { grade: 'B-', gradePoint: 2.75, remark: 'Below Satisfactory' };
  if (m >= 50) return { grade: 'C+', gradePoint: 2.50, remark: 'Average' };
  if (m >= 45) return { grade: 'C',  gradePoint: 2.25, remark: 'Pass' };
  return { grade: 'D',  gradePoint: 2.00, remark: 'Poor' };
}

function getCourseType(courseCode, courseTitle) {
  const normTitle = String(courseTitle || '').toLowerCase();
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

// Pseudo-random deterministic number generator seeded by string
function pseudoRandom(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate course marks with realistic number variations based on student archetype:
 * - "outstanding": 80-95 (A+, A), Dean's list, CGPA 3.82 - 3.96
 * - "first_class": 64-82 (B, B+, A-, A), CGPA 3.10 - 3.45
 * - "second_class": 48-64 (C, C+, B-, B), CGPA 2.30 - 2.68
 * - "struggling_fail": 26-55 (Contains 1 or more F grades, D, C), CGPA 1.70 - 2.15
 */
function generateCourseMarks(archetype, course, sem, courseIdx, studentId) {
  const isSessional = getCourseType(course.code, course.title) === 'sessional';
  const seed = `${studentId}_sem${sem}_c${courseIdx}_${course.code}`;
  const r1 = pseudoRandom(seed + '_att');
  const r2 = pseudoRandom(seed + '_ca');
  const r3 = pseudoRandom(seed + '_final');

  let attMarks = 10;
  let attPct = 95;
  let caMarks = 18;
  let finalMarks = 56;
  let isFailedCourse = false;

  if (archetype === 'outstanding') {
    // Top performer: A+ and A grades (80 - 95 marks)
    attMarks = r1 > 0.3 ? 10 : 9;
    attPct = attMarks === 10 ? Math.round(92 + r1 * 7) : 88;

    if (isSessional) {
      caMarks = Math.round(26 + r2 * 3.5); // 26 - 29 out of 30
      finalMarks = Math.round(52 + r3 * 7); // 52 - 59 out of 60
    } else {
      caMarks = Math.round(17.5 + r2 * 2.5); // 17.5 - 20 out of 20
      finalMarks = Math.round(54 + r3 * 10); // 54 - 64 out of 70
    }
  } else if (archetype === 'first_class') {
    // Good pass: B, B+, A- grades (63 - 78 marks)
    attMarks = r1 > 0.4 ? 8 : (r1 > 0.15 ? 9 : 7);
    attPct = Math.round(76 + r1 * 15);

    if (isSessional) {
      caMarks = Math.round(21 + r2 * 4.5); // 21 - 25 out of 30
      finalMarks = Math.round(44 + r3 * 8); // 44 - 52 out of 60
    } else {
      caMarks = Math.round(13.5 + r2 * 3.0); // 13.5 - 16.5 out of 20
      finalMarks = Math.round(42 + r3 * 10); // 42 - 52 out of 70
    }
  } else if (archetype === 'second_class') {
    // Average pass: C, C+, B- grades (48 - 63 marks)
    attMarks = r1 > 0.5 ? 6 : (r1 > 0.2 ? 7 : 5);
    attPct = Math.round(65 + r1 * 12);

    if (isSessional) {
      caMarks = Math.round(18 + r2 * 4.0); // 18 - 22 out of 30
      finalMarks = Math.round(38 + r3 * 7); // 38 - 45 out of 60
    } else {
      caMarks = Math.round(10.5 + r2 * 3.0); // 10.5 - 13.5 out of 20
      finalMarks = Math.round(31 + r3 * 9); // 31 - 40 out of 70
    }
  } else {
    // Struggling / Course Fail archetype (marks 28 - 54, with deliberate F in select courses)
    // Select specific hard theory courses to fail in Sem 2, Sem 3, or Sem 4
    const isHardTheory = !isSessional && (
      course.code.includes('1101') || // Differential Calculus
      course.code.includes('1203') || // Discrete Mathematics
      course.code.includes('2101') || // Data Structures
      course.code.includes('2201') || // Algorithms
      course.code.includes('2203') || // Theory of Computation
      course.code.includes('3101')    // Operating Systems
    );

    // Fail approximately 1 course in odd or even semesters for this student
    if (isHardTheory && (sem === 2 || sem === 3 || sem === 4 || sem === 5) && courseIdx <= 2) {
      isFailedCourse = true;
      attMarks = Math.round(2 + r1 * 3); // 2 - 5 marks (poor attendance)
      attPct = Math.round(42 + r1 * 18); // 42% - 60%
      caMarks = Math.round(6 + r2 * 3); // 6 - 9 out of 20
      finalMarks = Math.round(16 + r3 * 7); // 16 - 23 out of 70
      // Total will be between 26 and 37 (< 40 = F Fail)
    } else {
      // Passes with poor or average mark (D, C, C+)
      attMarks = r1 > 0.4 ? 5 : 4;
      attPct = Math.round(60 + r1 * 10);

      if (isSessional) {
        caMarks = Math.round(16 + r2 * 3.5); // 16 - 19.5 out of 30
        finalMarks = Math.round(34 + r3 * 7); // 34 - 41 out of 60
      } else {
        caMarks = Math.round(9 + r2 * 3.0); // 9 - 12 out of 20
        finalMarks = Math.round(26 + r3 * 9); // 26 - 35 out of 70
      }
    }
  }

  const totalMarks = Number((attMarks + caMarks + finalMarks).toFixed(1));
  const { grade, gradePoint, remark } = calcGradeAndPoint(totalMarks);
  const isPassed = grade !== 'F' && gradePoint > 0;

  return {
    courseCode: course.code,
    courseTitle: course.title,
    courseType: isSessional ? 'sessional' : 'theory',
    credits: Number(course.credits),
    attendancePercentage: attPct,
    attendanceMarks: attMarks,
    caMarks,
    continuousMarks: caMarks,
    finalMarks,
    marks: totalMarks,
    grade,
    gradePoint,
    creditPoints: Number((Number(course.credits) * gradePoint).toFixed(2)),
    status: isPassed ? 'passed' : 'failed',
    remark,
  };
}

/**
 * Determine a student's performance archetype:
 */
function resolveStudentArchetype(student) {
  const sid = String(student.studentId || '').trim();
  const name = String(student.name || '').toLowerCase();

  // Known high-achiever students
  if (sid === '220106' || sid === '190101' || name.includes('rotno')) {
    return 'outstanding'; // Dean's list, 3.85 - 3.95
  }

  // Known strong passing students
  if (sid === '220188' || sid === '201458' || name.includes('rafiqul')) {
    return 'first_class'; // First class, 3.10 - 3.38
  }

  // Known average passing students
  if (sid === '220199' || sid === '569874' || name.includes('sayeed') || name.includes('anwar')) {
    return 'second_class'; // Second class lower, 2.35 - 2.65
  }

  // Known struggling / failed students
  if (sid === '214785' || sid === '123654' || name.includes('mao') || name.includes('student')) {
    return 'struggling_fail'; // Course fail & academic warning, 1.70 - 2.15
  }

  // Generic fallback: distribute realistically across categories
  const lastDigit = parseInt(sid.slice(-1) || '0', 10);
  if (lastDigit === 0 || lastDigit === 6) return 'outstanding';
  if (lastDigit === 1 || lastDigit === 8 || lastDigit === 5) return 'first_class';
  if (lastDigit === 9 || lastDigit === 4 || lastDigit === 7) return 'second_class';
  return 'struggling_fail';
}

/**
 * Seed or update realistic varied semester results for all students in MongoDB
 */
async function seedRealisticResults(targetSession = null) {
  const { students, results } = getCollections();
  if (!students || !results) {
    throw new Error('Database collections not initialized');
  }

  const query = { studentId: { $exists: true, $ne: '' } };
  if (targetSession && targetSession !== 'all') {
    query.session = targetSession;
  }

  const allStudents = await students.find(query).toArray();
  console.log(`Starting realistic result variation generation for ${allStudents.length} students...`);

  let totalRecordsGenerated = 0;

  for (const st of allStudents) {
    const studentId = String(st.studentId).trim();
    const studentName = st.name || 'Student';
    const studentEmail = (st.email || '').toLowerCase();
    const rawSemester = String(st.semester || '7');
    const semDigits = rawSemester.replace(/\D/g, '');
    const currentSemNum = semDigits ? Math.min(8, Math.max(1, parseInt(semDigits, 10))) : 7;
    const session = st.session || '2021-2022';

    const archetype = resolveStudentArchetype(st);

    // Generate results for Semesters 1 up to currentSemNum
    for (let sem = 1; sem <= currentSemNum; sem++) {
      const curriculum = SEMESTER_COURSES[sem] || [];
      if (curriculum.length === 0) continue;

      let totalCredits = 0;
      let earnedCredits = 0;
      let totalGradePoints = 0;

      const coursesData = curriculum.map((course, idx) => {
        const cData = generateCourseMarks(archetype, course, sem, idx, studentId);
        totalCredits += cData.credits;
        if (cData.status === 'passed') {
          earnedCredits += cData.credits;
        }
        totalGradePoints += cData.credits * cData.gradePoint;
        return cData;
      });

      const sgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.00;
      const sgpaExact = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(3)) : 0.000;
      const examYear = 2021 + Math.floor((sem - 1) / 2);
      const isDeansList = sgpa >= 3.80;

      const doc = {
        studentId,
        studentName,
        studentEmail,
        currentSemester: currentSemNum,
        semester: sem,
        semesterLabel: SEMESTER_LABELS[sem] || `${sem}th Semester`,
        session,
        examYear,
        courses: coursesData,
        totalCredits: Number(totalCredits.toFixed(2)),
        earnedCredits: Number(earnedCredits.toFixed(2)),
        totalGradePoints: Number(totalGradePoints.toFixed(2)),
        sgpa,
        sgpaExact,
        isDeansList,
        status: 'published',
        publishedDate: new Date(Date.now() - (currentSemNum - sem) * 120 * 24 * 3600 * 1000),
        remarks: isDeansList 
          ? "Outstanding Academic Performance — Dean's Honors List"
          : (earnedCredits < totalCredits 
              ? "Official Result Published — Contains Course Backlog" 
              : "Official Semester Examination Result"),
        updatedBy: 'admin@cse.edu',
        updatedAt: new Date(),
      };

      await results.updateOne(
        { studentId, semester: sem },
        {
          $set: doc,
          $setOnInsert: {
            createdBy: 'admin@cse.edu',
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      totalRecordsGenerated++;
    }

    // Now compute accurate running CGPA, YGPA and Academic Standing across all semesters
    const { recalculateStudentCGPA } = require('../routes/result.routes');
    if (typeof recalculateStudentCGPA === 'function') {
      await recalculateStudentCGPA(studentId);
    }
  }

  console.log(`Successfully generated ${totalRecordsGenerated} realistic varied semester results!`);
  return { success: true, count: totalRecordsGenerated };
}

module.exports = {
  seedRealisticResults,
  generateCourseMarks,
  resolveStudentArchetype,
  calcGradeAndPoint,
};
