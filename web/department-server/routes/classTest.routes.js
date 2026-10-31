'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

const router = express.Router();

// Helper to compute letter grade, GPA, and interpretation (matching PUST Academic Ordinance)
const computeGrade = (score, max) => {
  if (score === null || score === undefined || !max || max <= 0) {
    return { letter: 'Ungraded', gpa: 0.0, interpretation: 'Pending Evaluation' };
  }
  const pct = (score / max) * 100;
  if (pct >= 80) return { letter: 'A+', gpa: 4.0, interpretation: 'Outstanding' };
  if (pct >= 75) return { letter: 'A', gpa: 3.75, interpretation: 'Excellent' };
  if (pct >= 70) return { letter: 'A-', gpa: 3.5, interpretation: 'Very Good' };
  if (pct >= 65) return { letter: 'B+', gpa: 3.25, interpretation: 'Good' };
  if (pct >= 60) return { letter: 'B', gpa: 3.0, interpretation: 'Satisfactory' };
  if (pct >= 55) return { letter: 'B-', gpa: 2.75, interpretation: 'Below Satisfactory' };
  if (pct >= 50) return { letter: 'C+', gpa: 2.5, interpretation: 'Average' };
  if (pct >= 45) return { letter: 'C', gpa: 2.25, interpretation: 'Pass' };
  if (pct >= 40) return { letter: 'D', gpa: 2.0, interpretation: 'Poor' };
  return { letter: 'F', gpa: 0.0, interpretation: 'Fail' };
};

// ── GET /api/class-tests/continuous-evaluation ─────────────────────
// Combines Class Tests (CT) and Assignments for Continuous Assessment (20% Weight)
// Query params: ?courseCode=CSE4104&studentEmail=...&studentId=...
router.get('/continuous-evaluation', async (req, res) => {
  try {
    const { classTests, assignments, assignmentSubmissions, courses } = getCollections();
    const { courseCode, studentEmail, studentId } = req.query;

    if (!courseCode) {
      return res.status(400).json({ success: false, error: 'courseCode parameter is required.' });
    }

    const clean = String(courseCode).replace(/[\s-]/g, '');
    const codeRegex = { $regex: clean.split('').join('\\s*'), $options: 'i' };

    const cleanEmail = studentEmail ? String(studentEmail).trim().toLowerCase() : '';
    const cleanId = studentId ? String(studentId).trim() : '';

    // 1. Fetch Course details to determine if Sessional or Theory
    let courseDoc = null;
    try {
      courseDoc = await courses.findOne({
        $or: [
          { code: codeRegex },
          { courseCode: codeRegex },
        ],
      });
    } catch (e) {
      console.warn('Could not query course document:', e.message);
    }

    // 2. Fetch Class Tests
    const cts = await classTests.find({ courseCode: codeRegex }).sort({ date: 1, createdAt: 1 }).toArray();

    // 3. Fetch Assignments
    const asgs = await assignments.find({ courseCode: codeRegex }).sort({ deadline: 1, createdAt: 1 }).toArray();

    const courseTitle = courseDoc?.title || cts[0]?.courseTitle || asgs[0]?.courseTitle || '';
    const isSessional = Boolean(
      (courseDoc && (courseDoc.type === 'Sessional' || courseDoc.type === 'Laboratory')) ||
      courseTitle.toLowerCase().includes('sessional') ||
      courseTitle.toLowerCase().includes('lab')
    );

    // 4. Fetch Student Submissions
    const subConditions = [];
    if (cleanEmail) {
      subConditions.push({ studentEmail: { $regex: `^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, $options: 'i' } });
    }
    if (cleanId) {
      subConditions.push({ studentId: cleanId });
    }

    const submissions = subConditions.length > 0
      ? await assignmentSubmissions.find({ $or: subConditions }).toArray()
      : [];

    const subMap = new Map();
    submissions.forEach((s) => subMap.set(String(s.assignmentId), s));

    // 5. Process Class Tests for student
    const evaluatedCTs = cts.map((ct) => {
      const marksList = Array.isArray(ct.marks) ? ct.marks : [];
      const totalMarks = Number(ct.totalMarks) || 20;

      const myEntry = marksList.find((m) => {
        if (cleanEmail && m.studentEmail && m.studentEmail.toLowerCase() === cleanEmail) return true;
        if (cleanId && m.studentId && String(m.studentId).trim() === cleanId) return true;
        return false;
      });

      if (myEntry) {
        const isAbsent = Boolean(myEntry.isAbsent);
        const score = !isAbsent && myEntry.marks !== null && myEntry.marks !== undefined && !isNaN(Number(myEntry.marks))
          ? Number(myEntry.marks)
          : (isAbsent ? 0 : null);
        const pct = score !== null ? Math.round((score / totalMarks) * 100 * 10) / 10 : null;
        const gradeInfo = computeGrade(score, totalMarks);

        return {
          id: String(ct._id),
          title: ct.title || 'Class Test',
          topic: ct.topic || '',
          room: ct.room || '',
          type: 'class_test',
          date: ct.date || '',
          totalMarks,
          obtainedMarks: score,
          isAbsent,
          isEvaluated: score !== null,
          percentage: pct,
          grade: isAbsent ? 'Absent' : gradeInfo.letter,
          gpa: isAbsent ? 0.0 : gradeInfo.gpa,
          interpretation: isAbsent ? 'Missed Assessment' : gradeInfo.interpretation,
          remarks: myEntry.remarks || '',
        };
      }

      return {
        id: String(ct._id),
        title: ct.title || 'Class Test',
        topic: ct.topic || '',
        room: ct.room || '',
        type: 'class_test',
        date: ct.date || '',
        totalMarks,
        obtainedMarks: null,
        isAbsent: false,
        isEvaluated: false,
        percentage: null,
        grade: 'Pending Evaluation',
        gpa: null,
        interpretation: 'Pending Instructor Marks',
        remarks: '',
      };
    });

    // 6. Process Assignments for student
    const evaluatedAssignments = asgs.map((asg) => {
      const sub = subMap.get(String(asg._id));
      const totalMarks = Number(asg.totalMarks) || 20;
      const hasMarks = sub && sub.marks !== null && sub.marks !== undefined && !isNaN(Number(sub.marks));
      const score = hasMarks ? Number(sub.marks) : null;
      const pct = score !== null ? Math.round((score / totalMarks) * 100 * 10) / 10 : null;
      const gradeInfo = computeGrade(score, totalMarks);

      return {
        id: String(asg._id),
        title: asg.title || 'Coursework Assignment',
        type: 'assignment',
        date: asg.deadline ? String(asg.deadline).split('T')[0] : '',
        totalMarks,
        obtainedMarks: score,
        isEvaluated: hasMarks,
        hasSubmitted: Boolean(sub),
        submittedAt: sub ? sub.submittedAt : null,
        isLate: sub ? Boolean(sub.isLate) : false,
        percentage: pct,
        grade: score !== null ? gradeInfo.letter : (sub ? 'Submitted (Ungraded)' : 'Not Submitted'),
        gpa: score !== null ? gradeInfo.gpa : null,
        interpretation: score !== null ? gradeInfo.interpretation : (sub ? 'Awaiting Evaluation' : 'Unsubmitted'),
        feedback: sub?.feedback || '',
        originalName: sub?.originalName || null,
        filePath: sub?.filePath || null,
      };
    });

    // 7. Combine all evaluated assessments
    const allAssessments = [...evaluatedCTs, ...evaluatedAssignments];
    const evaluatedItems = allAssessments.filter((item) => item.isEvaluated);

    // ── CALCULATION A: Sessional Course Rule (30% Weight, ALL CTs and Assignments considered) ──
    const totalObtainedAll = evaluatedItems.reduce((acc, curr) => acc + (curr.obtainedMarks || 0), 0);
    const totalPossibleAll = evaluatedItems.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0);
    const sessionalPct = totalPossibleAll > 0 ? (totalObtainedAll / totalPossibleAll) * 100 : 0;
    const sessionalMarks30 = totalPossibleAll > 0 ? (sessionalPct / 100) * 30 : 0;
    const sessionalGrade = totalPossibleAll > 0
      ? computeGrade(sessionalPct, 100)
      : { letter: 'Ungraded', gpa: 0.0, interpretation: 'No assessments evaluated yet' };

    // ── CALCULATION B: Theory / Non-Sessional Course Rule (20% Weight, BEST 2 of CTs and Assignments) ──
    const sorted = [...evaluatedItems].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    let theoryBest2Items = [];
    let theoryObtained = 0;
    let theoryPossible = 0;
    let theoryPct = 0;
    let theoryMarks20 = 0;
    let theoryGrade = { letter: 'Ungraded', gpa: 0.0, interpretation: 'No assessments evaluated yet' };

    if (evaluatedItems.length >= 2) {
      theoryBest2Items = sorted.slice(0, 2);
      theoryObtained = theoryBest2Items.reduce((acc, curr) => acc + (curr.obtainedMarks || 0), 0);
      theoryPossible = theoryBest2Items.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0);
      theoryPct = theoryPossible > 0 ? (theoryObtained / theoryPossible) * 100 : 0;
      theoryMarks20 = (theoryPct / 100) * 20;
      theoryGrade = computeGrade(theoryPct, 100);
    } else if (evaluatedItems.length === 1) {
      theoryBest2Items = sorted.slice(0, 1);
      theoryObtained = theoryBest2Items[0].obtainedMarks || 0;
      theoryPossible = theoryBest2Items[0].totalMarks || 0;
      theoryPct = theoryPossible > 0 ? (theoryObtained / theoryPossible) * 100 : 0;
      theoryMarks20 = (theoryPct / 100) * 20;
      theoryGrade = computeGrade(theoryPct, 100);
    }

    // Determine current active continuous mark based on course type
    const activeMaxMarks = isSessional ? 30 : 20;
    const activeWeightPct = isSessional ? 30 : 20;
    const activeObtainedMarks = isSessional
      ? Math.round(sessionalMarks30 * 100) / 100
      : Math.round(theoryMarks20 * 100) / 100;
    const activePercentage = isSessional
      ? Math.round(sessionalPct * 100) / 100
      : Math.round(theoryPct * 100) / 100;
    const activeGrade = isSessional ? sessionalGrade : theoryGrade;

    const calculationMethod = isSessional
      ? 'All evaluated CTs and assignments combined (30% Sessional Continuous Weight)'
      : evaluatedItems.length >= 2
      ? 'Best 2 evaluated CTs and assignments combined (20% Theory Continuous Weight)'
      : evaluatedItems.length === 1
      ? 'Based on 1 evaluated assessment so far (Best 2 will apply when 2+ assessments are conducted)'
      : 'No assessments evaluated yet';

    res.json({
      success: true,
      courseCode,
      courseTitle,
      isSessional,
      courseType: isSessional ? 'sessional' : 'theory',
      targetWeight: activeWeightPct,
      targetMaxMarks: activeMaxMarks,
      summary: {
        isSessional,
        courseType: isSessional ? 'sessional' : 'theory',
        maxMarks: activeMaxMarks,
        continuousMarks: activeObtainedMarks,
        percentage: activePercentage,
        letterGrade: activeGrade.letter,
        gpa: activeGrade.gpa,
        interpretation: activeGrade.interpretation,
        calculationMethod,
        totalAssessmentsCount: allAssessments.length,
        evaluatedCount: evaluatedItems.length,
        pendingCount: allAssessments.length - evaluatedItems.length,
        classTestsCount: evaluatedCTs.length,
        assignmentsCount: evaluatedAssignments.length,
        attendanceNote: 'Class attendance (10%) is not calculated in continuous assessment; it will be added to the final mark compilation at semester end.',
        // Sessional 30% Scale metrics (All CTs and assignments)
        sessionalScore: {
          maxMarks: 30,
          marks30: Math.round(sessionalMarks30 * 100) / 100,
          totalObtained: Math.round(totalObtainedAll * 100) / 100,
          totalPossible: totalPossibleAll,
          percentage: Math.round(sessionalPct * 100) / 100,
          letterGrade: sessionalGrade.letter,
          gpa: sessionalGrade.gpa,
          interpretation: sessionalGrade.interpretation,
        },
        // Theory 20% Scale metrics (Best 2 CTs and assignments)
        theoryBest2Score: {
          maxMarks: 20,
          marks20: Math.round(theoryMarks20 * 100) / 100,
          obtained: Math.round(theoryObtained * 100) / 100,
          possible: theoryPossible,
          percentage: Math.round(theoryPct * 100) / 100,
          letterGrade: theoryGrade.letter,
          gpa: theoryGrade.gpa,
          interpretation: theoryGrade.interpretation,
          itemsEvaluatedCount: evaluatedItems.length,
          best2Applied: evaluatedItems.length >= 2,
          selectedItems: theoryBest2Items.map((item) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            obtained: item.obtainedMarks,
            max: item.totalMarks,
            percentage: item.percentage,
            grade: item.grade,
          })),
        },
      },
      classTests: evaluatedCTs,
      assignments: evaluatedAssignments,
      allAssessments,
    });
  } catch (err) {
    console.error('Error computing continuous evaluation:', err);
    res.status(500).json({ success: false, error: 'Failed to compute continuous evaluation.' });
  }
});

// ── GET /api/class-tests ─────────────────────────────────────────
// Query params: ?courseCode=CSE4104&semester=7&studentEmail=...&studentId=...&teacherEmail=...
router.get('/', async (req, res) => {
  try {
    const { classTests } = getCollections();
    const { courseCode, semester, studentEmail, studentId, teacherEmail } = req.query;

    const query = {};
    if (courseCode) {
      const clean = String(courseCode).replace(/[\s-]/g, '');
      query.courseCode = { $regex: clean.split('').join('\\s*'), $options: 'i' };
    }
    if (semester && semester !== 'all') {
      const semNum = String(semester).replace(/[^0-9]/g, '');
      const semConditions = [
        { semester: semester },
        { semester: semNum },
        { semester: `${semNum}th Semester` },
      ];
      if (semNum && !isNaN(Number(semNum))) {
        semConditions.push({ semester: Number(semNum) });
      }
      query.$or = semConditions;
    }
    if (teacherEmail) {
      query.teacherEmail = teacherEmail;
    }

    const list = await classTests.find(query).sort({ date: -1, createdAt: -1 }).toArray();

    // Process each class test to calculate summary statistics and student's personal score if queried
    const results = list.map((ct) => {
      const marksList = Array.isArray(ct.marks) ? ct.marks : [];
      const totalMarks = Number(ct.totalMarks) || 20;

      const validScores = marksList
        .filter((m) => !m.isAbsent && m.marks !== null && m.marks !== undefined && !isNaN(Number(m.marks)))
        .map((m) => Number(m.marks));

      const evaluatedCount = validScores.length;
      const absentCount = marksList.filter((m) => Boolean(m.isAbsent)).length;
      const highestMarks = validScores.length > 0 ? Math.max(...validScores) : null;
      const lowestMarks = validScores.length > 0 ? Math.min(...validScores) : null;
      const sumMarks = validScores.reduce((acc, curr) => acc + curr, 0);
      const averageMarks = evaluatedCount > 0 ? Math.round((sumMarks / evaluatedCount) * 10) / 10 : null;
      const avgPercentage = averageMarks !== null ? Math.round((averageMarks / totalMarks) * 100) : null;

      const processed = {
        _id: ct._id,
        id: String(ct._id),
        title: ct.title,
        courseCode: ct.courseCode,
        courseTitle: ct.courseTitle || ct.courseCode,
        semester: ct.semester,
        date: ct.date,
        time: ct.time || '',
        totalMarks,
        topic: ct.topic || ct.syllabus || '',
        room: ct.room || '',
        teacherName: ct.teacherName || 'Course Teacher',
        teacherEmail: ct.teacherEmail || '',
        isPublished: ct.isPublished !== false,
        createdAt: ct.createdAt,
        updatedAt: ct.updatedAt,
        stats: {
          totalRoster: marksList.length,
          evaluatedCount,
          absentCount,
          highestMarks,
          lowestMarks,
          averageMarks,
          avgPercentage,
        },
      };

      // If student is querying, attach their personal result
      if (studentEmail || studentId) {
        const cleanEmail = studentEmail ? String(studentEmail).trim().toLowerCase() : '';
        const cleanId = studentId ? String(studentId).trim() : '';

        const myEntry = marksList.find((m) => {
          if (cleanEmail && m.studentEmail && m.studentEmail.toLowerCase() === cleanEmail) return true;
          if (cleanId && m.studentId && String(m.studentId).trim() === cleanId) return true;
          return false;
        });

        if (myEntry) {
          const score = myEntry.marks !== null && myEntry.marks !== undefined && !isNaN(Number(myEntry.marks))
            ? Number(myEntry.marks)
            : null;
          const isAbsent = Boolean(myEntry.isAbsent);
          const pct = score !== null ? Math.round((score / totalMarks) * 100) : null;
          const gradeInfo = computeGrade(score, totalMarks);

          processed.myResult = {
            studentId: myEntry.studentId,
            studentName: myEntry.studentName,
            studentEmail: myEntry.studentEmail,
            marks: score,
            isAbsent,
            percentage: pct,
            grade: isAbsent ? 'Absent' : gradeInfo.letter,
            gpa: isAbsent ? 0.0 : gradeInfo.gpa,
            remarks: myEntry.remarks || '',
          };
        } else {
          processed.myResult = null;
        }

        // Strip the full class marks array to keep student response light & secure
        delete processed.marks;
      } else {
        // Teacher / admin query gets the full roll-wise marks list
        processed.marks = marksList;
      }

      return processed;
    });

    res.json({
      success: true,
      count: results.length,
      classTests: results,
    });
  } catch (err) {
    console.error('Error fetching class tests:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch class tests.' });
  }
});

// ── GET /api/class-tests/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { classTests } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid class test ID.' });
    }

    const ct = await classTests.findOne({ _id: new ObjectId(id) });
    if (!ct) {
      return res.status(404).json({ success: false, error: 'Class test not found.' });
    }

    const marksList = Array.isArray(ct.marks) ? ct.marks : [];
    const totalMarks = Number(ct.totalMarks) || 20;

    const validScores = marksList
      .filter((m) => !m.isAbsent && m.marks !== null && m.marks !== undefined && !isNaN(Number(m.marks)))
      .map((m) => Number(m.marks));

    const evaluatedCount = validScores.length;
    const absentCount = marksList.filter((m) => Boolean(m.isAbsent)).length;
    const highestMarks = validScores.length > 0 ? Math.max(...validScores) : null;
    const lowestMarks = validScores.length > 0 ? Math.min(...validScores) : null;
    const sumMarks = validScores.reduce((acc, curr) => acc + curr, 0);
    const averageMarks = evaluatedCount > 0 ? Math.round((sumMarks / evaluatedCount) * 10) / 10 : null;

    res.json({
      success: true,
      classTest: {
        ...ct,
        id: String(ct._id),
        totalMarks,
        stats: {
          totalRoster: marksList.length,
          evaluatedCount,
          absentCount,
          highestMarks,
          lowestMarks,
          averageMarks,
        },
      },
    });
  } catch (err) {
    console.error('Error getting class test by id:', err);
    res.status(500).json({ success: false, error: 'Failed to load class test details.' });
  }
});

// ── POST /api/class-tests ────────────────────────────────────────
// Teacher creates a new offline Class Test entry for a course
router.post('/', async (req, res) => {
  try {
    const { classTests, students } = getCollections();
    const {
      title,
      courseCode,
      courseTitle,
      semester,
      date,
      time,
      totalMarks,
      topic,
      room,
      teacherName,
      teacherEmail,
      marks,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Class Test title is required.' });
    }
    if (!courseCode || !courseCode.trim()) {
      return res.status(400).json({ success: false, error: 'Course code is required.' });
    }

    const parsedTotalMarks = Number(totalMarks) > 0 ? Number(totalMarks) : 20;
    const cleanCourseCode = courseCode.trim().toUpperCase();
    const cleanSemester = String(semester || '7').replace(/\D/g, '') || '7';

    // If initial marks array is provided, use it; otherwise populate empty marks roster from enrolled students
    let initialMarks = [];
    if (Array.isArray(marks) && marks.length > 0) {
      initialMarks = marks;
    } else {
      try {
        const semNum = String(semester || '7').replace(/[^0-9]/g, '') || '7';
        const semConditions = [
          { semester: semNum },
          { semester: `${semNum}th Semester` },
          { semester: `Semester ${semNum}` },
        ];
        if (!isNaN(Number(semNum))) {
          semConditions.push({ semester: Number(semNum) });
        }

        const studentList = await students
          .find({
            status: { $ne: 'rejected' },
            $or: semConditions,
          })
          .sort({ studentId: 1 })
          .toArray();

        initialMarks = studentList.map((stu) => ({
          studentId: stu.studentId || '',
          studentName: stu.name || '',
          studentEmail: stu.email || '',
          marks: null,
          isAbsent: false,
          remarks: '',
        }));
      } catch (err) {
        console.warn('Could not auto-populate student roster:', err);
      }
    }

    const newCT = {
      title: title.trim(),
      courseCode: cleanCourseCode,
      courseTitle: courseTitle?.trim() || `${cleanCourseCode} Course`,
      semester: cleanSemester,
      date: date || new Date().toISOString().split('T')[0],
      time: time?.trim() || '',
      totalMarks: parsedTotalMarks,
      topic: topic?.trim() || '',
      room: room?.trim() || '',
      teacherName: teacherName || 'Course Teacher',
      teacherEmail: teacherEmail || '',
      marks: initialMarks,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await classTests.insertOne(newCT);
    newCT._id = result.insertedId;
    newCT.id = String(result.insertedId);

    res.status(201).json({
      success: true,
      message: `Class Test "${newCT.title}" created successfully!`,
      classTest: newCT,
    });
  } catch (err) {
    console.error('Error creating class test:', err);
    res.status(500).json({ success: false, error: 'Failed to create class test.' });
  }
});

// ── PUT /api/class-tests/:id ─────────────────────────────────────
// Update Class Test metadata (title, totalMarks, date, topic, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { classTests } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid class test ID.' });
    }

    const { title, date, time, totalMarks, topic, room, isPublished } = req.body;
    const updates = { updatedAt: new Date() };

    if (title !== undefined) updates.title = String(title).trim();
    if (date !== undefined) updates.date = String(date).trim();
    if (time !== undefined) updates.time = String(time).trim();
    if (totalMarks !== undefined && Number(totalMarks) > 0) updates.totalMarks = Number(totalMarks);
    if (topic !== undefined) updates.topic = String(topic).trim();
    if (room !== undefined) updates.room = String(room).trim();
    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);

    const result = await classTests.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Class test not found.' });
    }

    res.json({
      success: true,
      message: 'Class test details updated successfully.',
      classTest: { ...result, id: String(result._id) },
    });
  } catch (err) {
    console.error('Error updating class test:', err);
    res.status(500).json({ success: false, error: 'Failed to update class test.' });
  }
});

// ── PUT /api/class-tests/:id/marks ───────────────────────────────
// Teacher inputs/saves the full roll-wise marks for this class test
router.put('/:id/marks', async (req, res) => {
  try {
    const { classTests } = getCollections();
    const { id } = req.params;
    const { marks } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid class test ID.' });
    }
    if (!Array.isArray(marks)) {
      return res.status(400).json({ success: false, error: 'Marks must be an array of student records.' });
    }

    const ct = await classTests.findOne({ _id: new ObjectId(id) });
    if (!ct) {
      return res.status(404).json({ success: false, error: 'Class test not found.' });
    }

    const maxAllowed = Number(ct.totalMarks) || 20;

    // Sanitize and validate student marks entries
    const sanitizedMarks = marks.map((entry) => {
      const isAbsent = Boolean(entry.isAbsent);
      let val = null;
      if (!isAbsent && entry.marks !== null && entry.marks !== undefined && entry.marks !== '') {
        const num = Number(entry.marks);
        if (!isNaN(num)) {
          val = Math.max(0, Math.min(num, maxAllowed));
        }
      }

      return {
        studentId: String(entry.studentId || '').trim(),
        studentName: String(entry.studentName || '').trim(),
        studentEmail: String(entry.studentEmail || '').trim().toLowerCase(),
        marks: isAbsent ? 0 : val,
        isAbsent,
        remarks: String(entry.remarks || '').trim(),
      };
    });

    const result = await classTests.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { marks: sanitizedMarks, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: `Marks recorded successfully for ${sanitizedMarks.length} students!`,
      classTest: { ...result, id: String(result._id) },
    });
  } catch (err) {
    console.error('Error saving class test marks:', err);
    res.status(500).json({ success: false, error: 'Failed to save class test marks.' });
  }
});

// ── DELETE /api/class-tests/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { classTests } = getCollections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid class test ID.' });
    }

    const result = await classTests.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Class test not found.' });
    }

    res.json({
      success: true,
      message: 'Class test deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting class test:', err);
    res.status(500).json({ success: false, error: 'Failed to delete class test.' });
  }
});

module.exports = router;

