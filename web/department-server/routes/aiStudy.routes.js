'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const https = require('https');
const { ObjectId } = require('mongodb');
const { getCollections } = require('../config/db');

// Multer memory storage (up to 20MB files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Helper: Extract text from file buffer
async function extractTextFromBuffer(buffer, originalname, mimetype) {
  const filename = String(originalname || '').toLowerCase();

  // 1. Plain Text / Markdown
  if (filename.endsWith('.txt') || filename.endsWith('.md') || mimetype.includes('text/plain')) {
    return buffer.toString('utf-8');
  }

  // 2. PDF Documents
  if (filename.endsWith('.pdf') || mimetype.includes('pdf')) {
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const res = await parser.getText();
      try {
        await parser.destroy();
      } catch (_) {}
      return res.text || '';
    } catch (err) {
      console.warn('[aiStudy] PDF extraction error:', err.message);
      throw new Error('Failed to parse PDF document. Please make sure the PDF has selectable text.');
    }
  }

  // 3. Word Documents (.docx / .doc)
  if (filename.endsWith('.docx') || filename.endsWith('.doc') || mimetype.includes('word') || mimetype.includes('officedocument')) {
    try {
      const mammoth = require('mammoth');
      const res = await mammoth.extractRawText({ buffer });
      return res.value || '';
    } catch (err) {
      console.warn('[aiStudy] DOCX extraction error:', err.message);
      throw new Error('Failed to parse Word (.docx) document.');
    }
  }

  // Fallback: try utf-8
  return buffer.toString('utf-8');
}

// Helper: Call Gemini API using https.request with model fallbacks
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
  ];

  const postData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: 'application/json',
    },
  });

  for (const model of modelsToTry) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.request(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            },
            timeout: 25000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const json = JSON.parse(data);
                  const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (candidateText) {
                    return resolve(candidateText);
                  }
                  reject(new Error('Empty content from model'));
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error(`Model ${model} returned HTTP ${res.statusCode}: ${data.slice(0, 150)}`));
              }
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Model ${model} timed out after 25s`));
        });

        req.write(postData);
        req.end();
      });

      return result;
    } catch (err) {
      console.warn(`[aiStudy] Model ${model} attempt failed:`, err.message);
    }
  }

  throw new Error('All AI models are currently busy. Please retry in a few moments.');
}

/**
 * POST /api/ai-study/generate
 * Accepts file upload or rawText, generates structured study notes, key takeaways, and an interactive quiz.
 */
router.post('/generate', upload.single('file'), async (req, res) => {
  try {
    const { courseCode, studentEmail, studentName, difficulty = 'Medium', numQuestions = 5, rawText } = req.body;

    if (!courseCode) {
      return res.status(400).json({ error: 'Course code is required.' });
    }

    let extractedText = '';
    let sourceFilename = null;
    let fileType = 'text';

    if (req.file) {
      sourceFilename = req.file.originalname;
      fileType = req.file.mimetype || 'document';
      extractedText = await extractTextFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (rawText && typeof rawText === 'string') {
      extractedText = rawText.trim();
      sourceFilename = 'Pasted Study Notes';
      fileType = 'raw_text';
    }

    if (!extractedText || extractedText.trim().length < 35) {
      return res.status(400).json({
        error: 'The provided document contains insufficient readable text (at least 35 characters required). Please upload a readable file or paste notes directly.',
      });
    }

    // Limit text to ~30,000 characters to stay within efficient context window while covering full chapters
    const sanitizedText = extractedText.slice(0, 30000);
    const questionCount = Math.max(3, Math.min(10, parseInt(numQuestions, 10) || 5));
    const validDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';

    const prompt = `You are a distinguished Computer Science Professor and Academic Study Assistant for course ${courseCode}.
A university student has uploaded study notes / reference material for revision.

Your objective:
1. Provide a comprehensive, high-quality, formatted Markdown Study Note Summary.
2. Provide an interactive ${validDifficulty}-level multiple-choice quiz with ${questionCount} questions.

REQUIREMENTS:
- Markdown notes must use clear hierarchy (## for sections, ### for subsections, bullet points, bold terms, and code blocks if applicable).
- Include key definitions, core concepts, formula / algorithm breakdowns, and a dedicated "⚠️ Key Exam Traps & Common Mistakes" section.
- The multiple-choice quiz must have exactly 4 choices per question.
- "correctIndex" MUST be an integer between 0 and 3 (0 for first option, 1 for second, 2 for third, 3 for fourth).
- "explanation" must clearly explain why that answer is correct.

RETURN STRICTLY A JSON OBJECT (no markdown code blocks, no text outside the JSON) matching this exact schema:
{
  "topic": "Concise, descriptive topic title",
  "summary": "Executive summary paragraph (3-4 sentences giving the high-level picture)",
  "notesMarkdown": "Full formatted Markdown notes with ## headings, key definitions, bullet points, and exam tips...",
  "keyTakeaways": [
    "High-impact takeaway 1",
    "High-impact takeaway 2",
    "High-impact takeaway 3",
    "High-impact takeaway 4"
  ],
  "quiz": {
    "quizTitle": "${courseCode} Knowledge Check",
    "difficulty": "${validDifficulty}",
    "questions": [
      {
        "id": 1,
        "question": "Clear, specific conceptual question?",
        "options": [
          "Option A text",
          "Option B text",
          "Option C text",
          "Option D text"
        ],
        "correctIndex": 0,
        "explanation": "Clear explanation of the correct choice."
      }
    ]
  }
}

DOCUMENT CONTENT:
${sanitizedText}`;

    const rawAIJson = await callGemini(prompt);
    let parsedData = null;

    try {
      // Clean any accidental markdown fences if returned
      const cleaned = rawAIJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[aiStudy] Failed to parse AI JSON:', rawAIJson.slice(0, 300));
      return res.status(500).json({ error: 'AI output formatting error. Please try again.' });
    }

    // Prepare study note record
    const studyRecord = {
      courseCode: String(courseCode).toUpperCase().trim(),
      studentEmail: (studentEmail || '').toLowerCase().trim(),
      studentName: studentName || 'Student',
      sourceFilename,
      fileType,
      topic: parsedData.topic || `${courseCode} Study Notes`,
      summary: parsedData.summary || '',
      notesMarkdown: parsedData.notesMarkdown || '',
      keyTakeaways: Array.isArray(parsedData.keyTakeaways) ? parsedData.keyTakeaways : [],
      quiz: parsedData.quiz || { quizTitle: 'Quiz', difficulty: validDifficulty, questions: [] },
      difficulty: validDifficulty,
      createdAt: new Date().toISOString(),
    };

    // Save to MongoDB
    const { studyNotes } = getCollections();
    if (studyNotes) {
      const insertRes = await studyNotes.insertOne(studyRecord);
      studyRecord._id = insertRes.insertedId;
    }

    return res.status(200).json({
      ok: true,
      data: studyRecord,
    });
  } catch (err) {
    console.error('[aiStudy] Generation error:', err);
    return res.status(500).json({
      error: err.message || 'An error occurred while generating study notes and quiz.',
    });
  }
});

/**
 * GET /api/ai-study/history
 * Fetch student's recent study notes and quizzes for this course
 */
router.get('/history', async (req, res) => {
  try {
    const { courseCode, studentEmail } = req.query;
    if (!courseCode || !studentEmail) {
      return res.status(400).json({ error: 'courseCode and studentEmail are required.' });
    }

    const { studyNotes } = getCollections();
    if (!studyNotes) {
      return res.status(200).json({ ok: true, history: [] });
    }

    const list = await studyNotes
      .find({
        courseCode: String(courseCode).toUpperCase().trim(),
        studentEmail: String(studentEmail).toLowerCase().trim(),
      })
      .sort({ createdAt: -1 })
      .limit(15)
      .toArray();

    return res.status(200).json({ ok: true, history: list });
  } catch (err) {
    console.error('[aiStudy] History error:', err);
    return res.status(500).json({ error: 'Failed to load study history.' });
  }
});

/**
 * DELETE /api/ai-study/:id
 * Delete a specific saved study note entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { studyNotes } = getCollections();
    if (!studyNotes) {
      return res.status(404).json({ error: 'Collection not available' });
    }

    await studyNotes.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ ok: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('[aiStudy] Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete note.' });
  }
});

module.exports = router;
