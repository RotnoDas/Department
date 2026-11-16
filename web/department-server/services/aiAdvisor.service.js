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
 * Computes exact mathematical credit trajectory for 8 semesters
 */
function calculateAcademicTrajectory(studentResults = [], currentSemester = 7) {
  const totalDegreeCredits = TOTAL_DEGREE_CREDITS;

  // Completed credits and grade points
  let completedCredits = 0;
  let completedGradePoints = 0;
  let theoryCredits = 0;
  let theoryGradePoints = 0;
  let sessionalCredits = 0;
  let sessionalGradePoints = 0;

  const gradeDistribution = {
    'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
  };

  const laggingCourses = [];
  const attendanceIssues = [];
  let totalAttendanceMarksLost = 0;

  const semesterBreakdown = [];

  studentResults.forEach((sem) => {
    const semNum = Number(sem.semester);
    const semCredits = Number(sem.totalCredits) || 0;
    const semSgpa = Number(sem.sgpa) || 0;
    const semGradePoints = sem.totalGradePoints !== undefined
      ? Number(sem.totalGradePoints)
      : Number((semCredits * semSgpa).toFixed(2));

    completedCredits += semCredits;
    completedGradePoints += semGradePoints;

    semesterBreakdown.push({
      semester: semNum,
      label: sem.semesterLabel || `Semester ${semNum}`,
      credits: semCredits,
      sgpa: semSgpa,
      gradePoints: semGradePoints,
      coursesCount: (sem.courses || []).length
    });

    (sem.courses || []).forEach((c) => {
      const cr = Number(c.credits) || 0;
      const gp = Number(c.gradePoint) || 0;
      const type = c.courseType || getCourseType(c.courseCode, c.courseTitle);
      const grade = String(c.grade || '').toUpperCase();

      if (gradeDistribution[grade] !== undefined) {
        gradeDistribution[grade]++;
      }

      if (type === 'sessional') {
        sessionalCredits += cr;
        sessionalGradePoints += cr * gp;
      } else {
        theoryCredits += cr;
        theoryGradePoints += cr * gp;
      }

      // Track lagging courses (grade point < 3.25 or F/D)
      if (gp < 3.25 || grade === 'F' || grade === 'D') {
        laggingCourses.push({
          semester: semNum,
          courseCode: c.courseCode,
          courseTitle: c.courseTitle,
          credits: cr,
          grade: grade,
          gradePoint: gp,
          marks: c.marks,
          type
        });
      }

      // Attendance analysis
      if (c.attendancePercentage !== undefined && c.attendancePercentage !== null && c.attendancePercentage !== '') {
        const attPct = Number(c.attendancePercentage);
        const marksEarned = calcAttendanceMarks(attPct);
        const marksLost = 10 - marksEarned;
        if (marksLost > 0) {
          totalAttendanceMarksLost += marksLost;
          if (attPct < 85) {
            attendanceIssues.push({
              semester: semNum,
              courseCode: c.courseCode,
              courseTitle: c.courseTitle,
              attendancePercentage: attPct,
              marksEarned,
              marksLost
            });
          }
        }
      }
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

  // Remaining credits
  const remainingCredits = Math.max(0, Number((totalDegreeCredits - completedCredits).toFixed(2)));
  const completedSemestersCount = studentResults.length;
  const remainingSemestersCount = Math.max(0, 8 - completedSemestersCount);

  // Remaining semester courses from official curriculum
  const remainingSemesters = [];
  for (let s = completedSemestersCount + 1; s <= 8; s++) {
    const courses = SEMESTER_COURSES[s] || [];
    const credits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    remainingSemesters.push({
      semester: s,
      label: SEMESTER_LABELS[s] || `Semester ${s}`,
      credits: Number(credits.toFixed(2)),
      coursesCount: courses.length,
      courses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits }))
    });
  }

  // 1. Maximum Mathematically Achievable CGPA (if all remaining credits earn 4.00)
  const maxAchievableCGPA = remainingCredits > 0
    ? Number(((completedGradePoints + (remainingCredits * 4.00)) / totalDegreeCredits).toFixed(2))
    : currentCGPA;

  // 2. Minimum Possible CGPA (if all remaining credits earn 2.00 pass)
  const minAchievableCGPA = remainingCredits > 0
    ? Number(((completedGradePoints + (remainingCredits * 2.00)) / totalDegreeCredits).toFixed(2))
    : currentCGPA;

  // 3. Projected 8-Semester CGPA (weighted historical performance + latest momentum)
  const latestSem = semesterBreakdown[semesterBreakdown.length - 1];
  const latestSgpa = latestSem ? latestSem.sgpa : currentCGPA;
  // Dynamic projected future SGPA based on recent momentum
  const projectedFutureSgpa = Math.min(4.00, Math.max(2.00, Number((0.60 * currentCGPA + 0.40 * latestSgpa).toFixed(2))));
  const projectedFinalCGPA = remainingCredits > 0
    ? Number(((completedGradePoints + (remainingCredits * projectedFutureSgpa)) / totalDegreeCredits).toFixed(2))
    : currentCGPA;

  // 4. Target SGPA required to reach specific honors tiers
  function calcRequiredSgpa(targetCgpa) {
    if (remainingCredits <= 0) return null;
    const needed = (targetCgpa * totalDegreeCredits - completedGradePoints) / remainingCredits;
    return Number(needed.toFixed(2));
  }

  const reqSgpaDeansList = calcRequiredSgpa(3.80);
  const reqSgpaHonors = calcRequiredSgpa(3.75);
  const reqSgpaFirstClass = calcRequiredSgpa(3.00);

  return {
    totalDegreeCredits,
    completedCredits: Number(completedCredits.toFixed(2)),
    completedGradePoints: Number(completedGradePoints.toFixed(2)),
    remainingCredits,
    completedSemestersCount,
    remainingSemestersCount,
    currentCGPA,
    theoryGpa,
    theoryCredits: Number(theoryCredits.toFixed(2)),
    sessionalGpa,
    sessionalCredits: Number(sessionalCredits.toFixed(2)),
    gradeDistribution,
    laggingCourses,
    attendanceIssues,
    totalAttendanceMarksLost,
    semesterBreakdown,
    remainingSemesters,
    maxAchievableCGPA,
    minAchievableCGPA,
    projectedFutureSgpa,
    projectedFinalCGPA,
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
        label: "First Class with Honors",
        requiredSgpa: reqSgpaHonors,
        isPossible: reqSgpaHonors !== null ? reqSgpaHonors <= 4.00 : currentCGPA >= 3.75,
        alreadyAchieved: currentCGPA >= 3.75 && remainingCredits === 0
      },
      firstClass_3_00: {
        target: 3.00,
        label: "First Class",
        requiredSgpa: reqSgpaFirstClass,
        isPossible: reqSgpaFirstClass !== null ? reqSgpaFirstClass <= 4.00 : currentCGPA >= 3.00,
        alreadyAchieved: currentCGPA >= 3.00 && remainingCredits === 0
      }
    }
  };
}

/**
 * Generates rule-based expert diagnosis (used as fallback or baseline)
 */
function generateRuleBasedAdvisor(student, trajectory) {
  const { currentCGPA, projectedFinalCGPA, theoryGpa, sessionalGpa, laggingCourses, attendanceIssues, totalAttendanceMarksLost, requiredSgpas, remainingSemesters } = trajectory;

  let standingCategory = "Solid Academic Performance";
  if (projectedFinalCGPA >= 3.80) {
    standingCategory = "Dean's List / Highest Distinction";
  } else if (projectedFinalCGPA >= 3.75) {
    standingCategory = "On Track for First Class with Honors";
  } else if (projectedFinalCGPA >= 3.00) {
    standingCategory = "Solid First Class Standing";
  } else if (projectedFinalCGPA >= 2.50) {
    standingCategory = "Second Class (Upper Division) — Academic Push Needed";
  } else {
    standingCategory = "Academic Warning / Immediate Improvement Required";
  }

  const strengths = [];
  if (sessionalGpa >= 3.70) {
    strengths.push(`Exceptional practical proficiency with a Sessional Lab GPA of ${sessionalGpa.toFixed(2)}.`);
  }
  if (currentCGPA >= 3.75) {
    strengths.push(`Consistent high performance across published semesters (Current CGPA: ${currentCGPA.toFixed(2)} / 4.00).`);
  } else if (currentCGPA >= 3.00) {
    strengths.push(`Stable First Class trajectory across completed terms.`);
  }
  if (trajectory.gradeDistribution['A+'] > 0) {
    strengths.push(`Earned ${trajectory.gradeDistribution['A+']} top-tier A+ grades (Outstanding) across the curriculum.`);
  }
  if (strengths.length === 0) {
    strengths.push(`Solid foundation with ${trajectory.completedCredits} credits successfully completed.`);
  }

  const weaknesses = [];
  if (theoryGpa < sessionalGpa - 0.25) {
    weaknesses.push(`Noticeable gap between practical labs (${sessionalGpa.toFixed(2)}) and theoretical written exams (${theoryGpa.toFixed(2)}). Theory papers require stronger analytical preparation.`);
  }
  if (totalAttendanceMarksLost > 0) {
    weaknesses.push(`Lost an estimated ${totalAttendanceMarksLost} continuous assessment marks due to attendance falling below 90% in select courses.`);
  }
  if (laggingCourses.length > 0) {
    const sampleNames = laggingCourses.slice(0, 3).map(c => `${c.courseCode} (${c.grade})`).join(', ');
    weaknesses.push(`Encountered lower grade points in ${laggingCourses.length} course(s), including ${sampleNames}.`);
  }
  if (weaknesses.length === 0) {
    weaknesses.push(`No critical performance dips detected. Maintain your rigorous study habits in upcoming semesters.`);
  }

  const improvementPlan = [];
  // 1. Attendance optimization
  improvementPlan.push({
    priority: "High",
    category: "Attendance & Continuous Assessment",
    action: "Maintain strictly ≥ 90% class attendance in all upcoming courses.",
    impact: "Secures the maximum 10/10 marks under PUST Ordinance Sec 20.8 (iv), directly preventing borderline 79% (A) drops to 80% (A+)."
  });

  // 2. High-credit theory focus
  improvementPlan.push({
    priority: "High",
    category: "High-Weight Theoretical Courses",
    action: `Prioritize 3.0-credit core theory subjects in remaining semesters.`,
    impact: "A 3.0-credit course contributes double the weight of a 1.5-credit sessional lab to your term SGPA."
  });

  // 3. Thesis & Capstone guidance
  if (remainingSemesters.some(s => s.semester >= 7)) {
    improvementPlan.push({
      priority: "Medium",
      category: "Thesis & Senior Capstone (CSE 4100 & CSE 4200)",
      action: "Dedicate structured weekly hours to thesis research and software implementation.",
      impact: "Total 4.5 cumulative credits are allocated to thesis in Semesters 7 & 8; an A+ grade provides high-impact grade point leverage."
    });
  }

  // 4. Target milestone
  if (requiredSgpas.honors_3_75.isPossible && !requiredSgpas.honors_3_75.alreadyAchieved) {
    improvementPlan.push({
      priority: "High",
      category: "Honors Milestone (3.75 CGPA)",
      action: `Maintain an average SGPA of at least ${requiredSgpas.honors_3_75.requiredSgpa} across your remaining ${trajectory.remainingSemestersCount} semester(s).`,
      impact: "Guarantees graduation with First Class with Honors distinction on your official transcript."
    });
  }

  const mistakesToAvoid = [
    "Never let attendance fall below 90%: PUST Ordinance Section 20.8 (iv) awards full 10 marks only for ≥90% attendance. Dropping below 85% immediately costs you continuous assessment marks, turning borderline 79% (Grade A) into lost grade points.",
    "Do not treat 3.0-credit theory courses like short sessional labs: Theory subjects carry double the credit weight of 1.5-credit labs; losing grade points in core theory pulls down your CGPA much faster.",
    "Do not delay Senior Thesis & Project deliverables: In Semesters 7 & 8, your Thesis (CSE 4100 & CSE 4200) carries 4.5 cumulative credits. Leaving research or coding until the last weeks directly risks lower viva and external board marks."
  ];

  const liveMessageNarrative = `🎓 1. Final 8-Semester Degree Forecast:
Based on your ${trajectory.completedCredits} completed credits, if you maintain your current academic trajectory, your projected graduation CGPA will be ${projectedFinalCGPA.toFixed(2)} / 4.00 (${standingCategory}). Your maximum theoretical ceiling is ${trajectory.maxAchievableCGPA.toFixed(2)}. ${requiredSgpas.honors_3_75.isPossible ? `To secure First Class with Honors (≥3.75), you must maintain an average SGPA of at least ${requiredSgpas.honors_3_75.requiredSgpa} across your remaining ${trajectory.remainingSemestersCount} semester(s).` : ''}

📋 2. Suggested Improvement Plan:
${improvementPlan.map((p, idx) => `• [${p.category}]: ${p.action}`).join('\n')}

⚠️ 3. Critical Mistakes to Avoid (যেসব ভুল করা যাবে না):
${mistakesToAvoid.map((m, idx) => `• Mistake ${idx + 1}: ${m}`).join('\n')}

✨ Excellence is a daily habit. Consistent attendance and early exam preparation will ensure your degree honors remain secure!`;

  return {
    summary: `${student.name || 'Student'} currently holds an overall CGPA of ${currentCGPA.toFixed(2)} with ${trajectory.completedCredits} credits completed. Based on credit trajectory modeling, the projected final 8-semester CGPA is ${projectedFinalCGPA.toFixed(2)} / 4.00, with a maximum reachable ceiling of ${trajectory.maxAchievableCGPA.toFixed(2)}.`,
    standingCategory,
    strengths,
    weaknesses,
    improvementPlan,
    mistakesToAvoid,
    liveMessageNarrative,
    motivationalQuote: "Excellence is not an act, but a habit. With consistent attendance and focused exam preparation, your target graduation standing is well within reach."
  };
}

/**
 * Calls Gemini API to get a personalized, professor-grade academic evaluation
 */
async function generateAIEvaluation(student, trajectory) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = generateRuleBasedAdvisor(student, trajectory);

  if (!apiKey) {
    console.log('[AI Advisor] No GEMINI_API_KEY found, using rule-based advisor.');
    return { ...fallback, source: 'rule-engine' };
  }

  try {
    const prompt = `You are the Senior Academic Dean and Academic Advisor for the Department of Computer Science and Engineering at Pabna University of Science and Technology (PUST).
A student has requested an official AI academic performance evaluation and 8-semester graduation forecast.

STUDENT PROFILE:
- Name: ${student.name} (Student ID: ${student.studentId})
- Current Semester: Semester ${student.semester || student.currentSemester || 7}
- Completed Semesters: ${trajectory.completedSemestersCount} of 8 Semesters
- Completed Credits: ${trajectory.completedCredits} / ${trajectory.totalDegreeCredits} Total Degree Credits
- Current CGPA: ${trajectory.currentCGPA.toFixed(2)} / 4.00
- Theory Courses GPA: ${trajectory.theoryGpa.toFixed(2)} (Total Theory Credits: ${trajectory.theoryCredits})
- Sessional Labs GPA: ${trajectory.sessionalGpa.toFixed(2)} (Total Sessional Credits: ${trajectory.sessionalCredits})
- Grade Distribution: A+: ${trajectory.gradeDistribution['A+']}, A: ${trajectory.gradeDistribution['A']}, A-: ${trajectory.gradeDistribution['A-']}, B+: ${trajectory.gradeDistribution['B+']}, B: ${trajectory.gradeDistribution['B']}, B-: ${trajectory.gradeDistribution['B-']}, Below B-: ${trajectory.gradeDistribution['C+'] + trajectory.gradeDistribution['C'] + trajectory.gradeDistribution['D'] + trajectory.gradeDistribution['F']}
- Attendance Marks Lost: ~${trajectory.totalAttendanceMarksLost} marks across prior courses
- Lagging Courses (< 3.25 GP): ${trajectory.laggingCourses.map(c => `${c.courseCode} (${c.courseTitle}, Grade: ${c.grade})`).join(', ') || 'None'}

MATHEMATICAL TRAJECTORY (PUST Ordinance Equations):
- Projected Final 8-Semester CGPA: ${trajectory.projectedFinalCGPA.toFixed(2)} / 4.00
- Absolute Maximum Achievable CGPA (if all remaining semesters earn 4.00): ${trajectory.maxAchievableCGPA.toFixed(2)} / 4.00
- Remaining Credits to Complete: ${trajectory.remainingCredits} credits across ${trajectory.remainingSemestersCount} semester(s)
- Required SGPA per remaining semester for First Class with Honors (3.75): ${trajectory.requiredSgpas.honors_3_75.isPossible ? trajectory.requiredSgpas.honors_3_75.requiredSgpa : 'Mathematically Unreachable'}
- Required SGPA per remaining semester for Dean's List (3.80): ${trajectory.requiredSgpas.deansList_3_80.isPossible ? trajectory.requiredSgpas.deansList_3_80.requiredSgpa : 'Mathematically Unreachable'}

INSTRUCTIONS:
Return a strictly valid JSON response (no markdown fences, no raw text) with the following structure:
{
  "summary": "2-3 sentences providing an executive academic diagnosis and projected graduation outcome.",
  "standingCategory": "Category title e.g. First Class with Honors Trajectory, High Honors Candidate, etc.",
  "strengths": ["Specific strength 1 based on their data", "Specific strength 2"],
  "weaknesses": ["Specific weakness or risk 1 (e.g. theory vs lab gap, attendance marks lost)", "Specific weakness 2"],
  "improvementPlan": [
    {
      "priority": "High" or "Medium",
      "category": "Area title e.g. Class Attendance Optimization, Core Theory Mastery, Senior Thesis Focus",
      "action": "Concrete, actionable step the student must take.",
      "impact": "Expected academic benefit and how it preserves or raises their graduation CGPA."
    }
  ],
  "motivationalQuote": "An inspiring, professorial encouraging remark tailored to their standing."
}`;

    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let aiResponseText = null;

    for (const modelName of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(2500),
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
      } catch (err) {
        // Fallback silently if timeout or spike
      }
    }

    if (!aiResponseText) {
      console.warn('[AI Advisor] No Gemini response text, using rule-based advisor.');
      return { ...fallback, source: 'rule-engine' };
    }

    const cleanJson = aiResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      summary: parsed.summary || fallback.summary,
      standingCategory: parsed.standingCategory || fallback.standingCategory,
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : fallback.strengths,
      weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : fallback.weaknesses,
      improvementPlan: Array.isArray(parsed.improvementPlan) && parsed.improvementPlan.length > 0 ? parsed.improvementPlan : fallback.improvementPlan,
      mistakesToAvoid: fallback.mistakesToAvoid,
      liveMessageNarrative: fallback.liveMessageNarrative,
      motivationalQuote: parsed.motivationalQuote || fallback.motivationalQuote,
      source: 'ai-advisor'
    };
  } catch (err) {
    console.error('[AI Advisor] Error invoking Gemini API:', err);
    return { ...fallback, source: 'rule-engine' };
  }
}

/**
 * Live interactive Q&A with AI Academic Advisor (Gemini-style Chatbot)
 */
async function answerAcademicQuestion(student, trajectory, question) {
  const apiKey = process.env.GEMINI_API_KEY;
  const qNorm = String(question || '').trim().toLowerCase();
  const currentCGPA = trajectory.currentCGPA;
  const projectedCGPA = trajectory.projectedFinalCGPA;
  const maxCGPA = trajectory.maxAchievableCGPA;
  const completedCredits = trajectory.completedCredits;
  const remainingCredits = trajectory.remainingCredits;
  const remainingSemCount = trajectory.remainingSemestersCount;
  const standing = projectedCGPA >= 3.80 ? "Dean's List / Highest Distinction" : projectedCGPA >= 3.75 ? "First Class with Honors" : "First Class";

  // Intelligent conversational fallback replies with randomized variations
  let fallbackReply = `Based on your records, your current CGPA is ${currentCGPA.toFixed(2)} with ${completedCredits} completed credits. Maintaining your trajectory projects a final 8-semester graduation CGPA of ${projectedCGPA.toFixed(2)} / 4.00 (${standing}). Your absolute mathematical ceiling stands at ${maxCGPA.toFixed(2)}.`;

  if (qNorm.includes('prediction') || qNorm.includes('final') || qNorm.includes('8') || qNorm.includes('graduate') || qNorm.includes('result') || qNorm.includes('standing')) {
    const variations = [
      `🎓 **Final 8-Semester Degree Forecast:**\nWith ${completedCredits} credits officially verified, your projected graduation CGPA is **${projectedCGPA.toFixed(2)} / 4.00** (${standing}). You have ${remainingSemCount} semester(s) remaining (${remainingCredits} credits). If you score 4.00 across all remaining courses, your absolute highest possible ceiling is **${maxCGPA.toFixed(2)}**.`,
      `🎓 **Degree Outcome Projection:**\nYour current academic velocity points toward a final graduation CGPA of **${projectedCGPA.toFixed(2)} / 4.00**, placing you solidly in the **${standing}** tier. Your maximum achievable ceiling across the 162.25 total degree credits is **${maxCGPA.toFixed(2)}**. Maintaining an SGPA of 3.80+ in upcoming terms will cement top departmental standing.`,
      `🎓 **Graduation Prediction:**\nBased on your historical course performance, you are on track to graduate with a **${projectedCGPA.toFixed(2)} CGPA** (${standing}). With ${remainingCredits} credits still to be completed, you have substantial room to push this upward toward your maximum ceiling of **${maxCGPA.toFixed(2)}**.`
    ];
    fallbackReply = variations[Math.floor(Math.random() * variations.length)];
  } else if (qNorm.includes('plan') || qNorm.includes('improve') || qNorm.includes('better') || qNorm.includes('action') || qNorm.includes('study') || qNorm.includes('boost')) {
    const variations = [
      `📋 **Actionable Improvement Plan:**\n1. **High-Credit Theory Priority:** Focus primarily on 3.0-credit theory courses; they carry twice the mathematical weight of labs and dictate the bulk of your term SGPA.\n2. **Lock In 10/10 Attendance:** Maintain lecture presence ≥ 90% across every course to guarantee maximum continuous marks under PUST Ordinance Sec 20.8 (iv).\n3. **Thesis & Capstone Milestones:** For CSE 4100 & CSE 4200 (4.5 credits total), establish regular research deliverables with your supervisor early to lock in top defense marks.`,
      `📋 **Strategic Performance Roadmap:**\n1. **Target 3.0-Credit Theory Papers:** Heavy credit theory courses provide the greatest leverage on your cumulative GPA. Form structured study groups around previous year question banks.\n2. **Maximize Continuous Assessment:** Secure all 10 attendance marks by keeping attendance at 90%+ in every class, giving you a safe cushion before written finals.\n3. **Early Senior Thesis Execution:** In Semesters 7 & 8, your thesis contributes significantly to graduation honors. Regular progress reports to your committee guarantee an A/A+.`
    ];
    fallbackReply = variations[Math.floor(Math.random() * variations.length)];
  } else if (qNorm.includes('mistake') || qNorm.includes('vul') || qNorm.includes('avoid') || qNorm.includes('trap') || qNorm.includes('pitfall') || qNorm.includes('risk')) {
    const variations = [
      `⚠️ **Top 3 Critical Mistakes to Avoid:**\n1. **Attendance Slippage:** Never let class attendance drop below 90%. Slipping below 85% forfeits continuous assessment marks, easily demoting a borderline 79% (Grade A) to a lower tier.\n2. **Misallocated Study Hours:** Avoid spending equal preparation time across all subjects—3.0-credit theory courses have double the grade impact of 1.5-credit labs.\n3. **Late Thesis Rush:** Never leave capstone implementation or documentation to the final month. Examination panels grade technical depth and methodology strictly.`,
      `⚠️ **Essential Pitfalls to Steer Clear Of:**\n1. **Missing Classes:** Any attendance below 90% forfeits free continuous marks under university rules.\n2. **Neglecting Core Theory:** Relying solely on high lab scores while neglecting difficult theory papers hurts cumulative GPA.\n3. **Postponing Supervisor Reviews:** Infrequent consultations with your project guide can result in severe deductions during final defense presentations.`
    ];
    fallbackReply = variations[Math.floor(Math.random() * variations.length)];
  } else if (qNorm.includes('dean') || qNorm.includes('3.8') || qNorm.includes('honor')) {
    const req = trajectory.requiredSgpas?.deansList_3_80;
    if (req?.isPossible) {
      fallbackReply = `⭐ **Honors & Dean's List Path:**\nTo secure Dean's List distinction (CGPA ≥ 3.80), you must average at least **${req.requiredSgpa} SGPA** across your remaining ${remainingSemCount} semester(s). Prioritize A+ grades in 3.0-credit theory subjects and ensure ≥90% attendance to maximize continuous assessment marks.`;
    } else {
      fallbackReply = `⭐ **Honors Standing:**\nYour mathematical ceiling stands at **${maxCGPA.toFixed(2)}**. While 3.80 is out of reach, you can comfortably graduate with **First Class with Honors (≥3.75)** by maintaining an SGPA of **${trajectory.requiredSgpas?.honors_3_75?.requiredSgpa || '3.75'}** in your remaining terms.`;
    }
  } else if (qNorm.includes('attendance') || qNorm.includes('class') || qNorm.includes('present')) {
    fallbackReply = `📌 **Class Attendance Rules (PUST Ordinance Sec 20.8 iv):**\n• **≥ 90%:** Full 10 Marks\n• **85% - 89%:** 9 Marks\n• **80% - 84%:** 8 Marks\n• **75% - 79%:** 7 Marks\n• **70% - 74%:** 6 Marks\n• **60% - 69%:** 5 Marks\n• **< 60%:** 0 Marks\nKeeping ≥ 90% attendance guarantees 10 free marks, which frequently elevates a 79% (A) into an 80% (A+)!`;
  }

  if (!apiKey) {
    return { reply: fallbackReply, source: 'smart-advisor' };
  }

  try {
    const prompt = `You are the Senior Academic AI Advisor for the Department of Computer Science & Engineering (CSE) at Pabna University of Science and Technology (PUST).
The student ${student.name} (ID: ${student.studentId}) is asking: "${question}"

STUDENT ACADEMIC PROFILE:
- Current CGPA: ${currentCGPA.toFixed(2)} / 4.00
- Completed Credits: ${completedCredits} of ${trajectory.totalDegreeCredits} total degree credits
- Remaining Semesters: ${remainingSemCount} (${remainingCredits} credits remaining)
- Projected Final 8-Semester CGPA: ${projectedCGPA.toFixed(2)} / 4.00 (${standing})
- Max Achievable Ceiling: ${maxCGPA.toFixed(2)} / 4.00
- Required SGPA for Honors (3.75+): ${trajectory.requiredSgpas?.honors_3_75?.requiredSgpa || 'N/A'}
- Required SGPA for Dean's List (3.80+): ${trajectory.requiredSgpas?.deansList_3_80?.requiredSgpa || 'N/A'}

GUIDELINES:
1. Always respond in English.
2. Never mention or refer to Gemini, Google, OpenAI, or any underlying model/company name. You are simply the Academic AI Advisor.
3. Use fresh, varied wording and natural conversational phrasing.
4. Address the student's question directly with actionable, encouraging academic advice based on their exact numbers.
5. If asked about predictions, improvement plans, or mistakes to avoid ("ki ki vul kora jabe na"), provide concise bullet points highlighting:
   - High-credit 3.0 theory focus
   - 90%+ attendance continuous assessment lock-in
   - Senior thesis (CSE 4100 / 4200) execution
6. Keep response under 160 words, clean and engaging.`;

    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    for (const m of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3500),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
            }
          })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { reply: text.trim(), source: 'ai-advisor' };
        }
      } catch (e) {
        // Fall through
      }
    }
  } catch (err) {
    console.warn('[AI Advisor] Gemini Chat error:', err.message);
  }

  return { reply: fallbackReply, source: 'smart-advisor' };
}

/**
 * Generates dynamic, varied English guidance messages every time requested
 */
async function generateDynamicEnglishGuidance(student, trajectory, variation = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  const currentCGPA = trajectory.currentCGPA;
  const projectedCGPA = trajectory.projectedFinalCGPA;
  const maxCGPA = trajectory.maxAchievableCGPA;
  const reqHonors = trajectory.requiredSgpas?.honors_3_75;
  const remainingCount = trajectory.remainingSemestersCount;
  const standing = trajectory.projectedFinalCGPA >= 3.80
    ? "Dean's List / Highest Honors"
    : trajectory.projectedFinalCGPA >= 3.75
    ? "First Class with Honors"
    : "First Class";

  const fallbackTemplates = [
    // Template 1: Strategic Credit Leverage Perspective
    `🎓 1. Final 8-Semester Degree Forecast:
Based on your official record of ${trajectory.completedCredits} credits, if you sustain your current momentum, your projected graduation CGPA will be ${projectedCGPA.toFixed(2)} / 4.00 (${standing}). Your absolute mathematical ceiling stands at ${maxCGPA.toFixed(2)}. ${reqHonors?.isPossible ? `To firmly secure First Class with Honors (≥3.75), you must maintain an average SGPA of at least ${reqHonors.requiredSgpa} across your remaining ${remainingCount} semester(s).` : ''}

📋 2. Actionable Improvement Plan:
• [High-Credit Theory Mastery]: Prioritize 3.0-credit core theory courses like Software Engineering and Computer Networks; these carry twice the weight of practical labs and dictate the bulk of your term SGPA.
• [Continuous Assessment Lock-In]: Maintain strict ≥90% attendance in lectures and laboratory sessions to automatically secure the full 10/10 attendance marks before final written examinations.
• [Senior Thesis & Capstone Execution]: In Semesters 7 & 8, your Thesis (CSE 4100 & CSE 4200) contributes 4.5 cumulative credits. Consistent weekly research milestones and early coding will ensure an A+ from the examination committee.

⚠️ 3. Critical Mistakes to Avoid:
• Mistake 1: Never let class attendance drop below 90%. Under PUST Ordinance Section 20.8 (iv), slipping below this threshold deducts continuous assessment marks, turning borderline 79% (Grade A) into lost grade points.
• Mistake 2: Avoid spending equal study hours across all subjects; 3.0-credit courses have double the grade impact compared to 1.5-credit sessional labs.
• Mistake 3: Never leave thesis documentation or software testing for the final weeks before submission. Board defense panels grade rigor and methodology heavily.

✨ Academic excellence is built through daily consistency. Stay focused and disciplined!`,

    // Template 2: Honors Distinction & Competitive Excellence Perspective
    `🎓 1. Graduation Trajectory & Final Prediction:
Reviewing your completed semesters, your academic trajectory points toward a projected final CGPA of ${projectedCGPA.toFixed(2)} / 4.00 (${standing}). Your highest mathematically achievable ceiling is ${maxCGPA.toFixed(2)}. ${reqHonors?.isPossible ? `To graduate with First Class with Honors (≥3.75), your target benchmark across remaining terms is an average SGPA of ${reqHonors.requiredSgpa}.` : ''}

📋 2. Recommended Strategic Roadmap:
• [Theory Examination Strategy]: Dedicate focused preparation to theoretical exam question patterns and analytical problem-solving in heavy-weight 3.0-credit courses.
• [Attendance Maximization]: Target 100% presence in all lecture slots. Under university regulations, achieving ≥90% guarantees the maximum 10-point continuous assessment cushion.
• [Senior Research Leadership]: Treat your 4.5-credit Senior Thesis & Project (CSE 4100 & 4200) as your flagship academic showcase. Early literature reviews and robust prototype implementation lock in top marks.

⚠️ 3. Key Pitfalls to Steer Clear Of:
• Pitfall 1: Falling below the 90% attendance barrier. Every 5% reduction forfeits precious continuous marks that cannot be recovered in final exams.
• Pitfall 2: Neglecting theoretical written exams while over-relying on practical labs. Core theory papers carry the highest leverage on graduation ranking.
• Pitfall 3: Postponing supervisor meetings and thesis progress reports until the end of the term. Regular advisor feedback prevents last-minute viva deductions.

✨ Consistency in attendance and rigorous exam preparation will ensure your degree honors remain fully intact!`,

    // Template 3: Risk Mitigation & Performance Optimization Perspective
    `🎓 1. Overall Academic Forecast:
Analyzing your ${trajectory.completedCredits} completed credits, continuing at your current pace yields an estimated degree CGPA of ${projectedCGPA.toFixed(2)} / 4.00 (${standing}). Your maximum potential ceiling is ${maxCGPA.toFixed(2)}. ${reqHonors?.isPossible ? `Safeguarding your First Class with Honors standing (≥3.75) requires an average SGPA of at least ${reqHonors.requiredSgpa} in your upcoming ${remainingCount} semester(s).` : ''}

📋 2. Tailored Action Directive:
• [Credit-Weighted Focus]: Direct your primary study hours toward 3.0-credit theoretical subjects, as their mathematical weight on your cumulative GPA is double that of laboratory classes.
• [Full Attendance Guarantee]: Ensure your attendance never dips below 90% across any semester, ensuring full 10/10 marks under PUST Ordinance Sec 20.8 (iv).
• [Capstone & Thesis Milestone Management]: Establish structured weekly goals for CSE 4100 & CSE 4200 (4.5 cumulative credits). Delivering clean research outcomes guarantees high defense marks.

⚠️ 3. Essential Errors to Avoid:
• Error 1: Missing lecture sessions without medical clearance. Attendance below 90% immediately downgrades your continuous evaluation score.
• Error 2: Treating heavy theory papers with casual revision. Comprehensive conceptual study is required to convert B+ marks into A/A+.
• Error 3: Delaying thesis implementation until the final month. Examination committees scrutinize project depth and timely progress.

✨ Keep your daily study habits sharp and your attendance high. Your graduation goals are within your grasp!`
  ];

  const templateIndex = Math.abs(Number(variation) || 0) % fallbackTemplates.length;
  const fallbackText = fallbackTemplates[templateIndex];

  if (!apiKey) {
    return { text: fallbackText, source: 'smart-advisor', variation: templateIndex };
  }

  try {
    const focusAngles = [
      "Focus heavily on credit leverage, maximizing 3.0 credit theory exams and thesis execution.",
      "Focus heavily on academic discipline, attendance clearance (Section 20.8 iv), and eliminating borderline grade drops.",
      "Focus heavily on graduation standing, Dean's List / Honors milestones, and supervisor-evaluated thesis excellence."
    ];
    const angle = focusAngles[templateIndex % focusAngles.length];

    const prompt = `You are the Senior Academic Dean and Academic Advisor for the Department of Computer Science & Engineering at Pabna University of Science and Technology (PUST).
Write an official, encouraging academic guidance message for student ${student.name} (ID: ${student.studentId}).

CRITICAL CONSTRAINTS:
1. ALWAYS write strictly in ENGLISH (never use Bengali or any other language).
2. Use fresh, unique vocabulary and distinct sentence structures each time (do not repeat standard clichés).
3. The response must follow this 3-part structure clearly:

🎓 1. Final 8-Semester Degree Forecast:
State their projected graduation CGPA (${projectedCGPA.toFixed(2)} / 4.00, ${standing}) based on their ${trajectory.completedCredits} completed credits, their maximum ceiling (${maxCGPA.toFixed(2)}), and the required SGPA per remaining term (${reqHonors?.isPossible ? reqHonors.requiredSgpa : 'N/A'}) to lock in Honors (≥3.75).

📋 2. Recommended Action Plan:
Provide 3 concrete, high-impact strategies for their upcoming semesters (${angle}).

⚠️ 3. Critical Mistakes to Avoid:
State 3 specific errors they must NEVER make (e.g., dropping attendance below 90% which forfeits continuous marks under Section 20.8 iv; treating 3.0-credit theory courses like short labs; delaying senior thesis CSE 4100/4200 work until the last month).

End with a short inspiring closing remark.`;

    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    for (const m of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85
            }
          })
        });

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 100) {
          return { text: text.trim(), source: 'ai-advisor', variation: templateIndex };
        }
      } catch (e) {
        // Continue
      }
    }
  } catch (err) {
    console.warn('[AI Advisor] Dynamic guidance error:', err.message);
  }

  return { text: fallbackText, source: 'smart-advisor', variation: templateIndex };
}

module.exports = {
  TOTAL_DEGREE_CREDITS,
  calculateAcademicTrajectory,
  generateRuleBasedAdvisor,
  generateAIEvaluation,
  answerAcademicQuestion,
  generateDynamicEnglishGuidance
};
