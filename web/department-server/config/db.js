const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let db;
let collections = {};

const connectDB = async () => {
  if (db) return { db, collections };

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db(process.env.DB_NAME || 'department_db');

  collections = {
    users: db.collection('user'),
    students: db.collection('students'),
    teachers: db.collection('teachers'),
    employees: db.collection('employees'),
    admins: db.collection('admins'),
    notices: db.collection('notices'),
    courses: db.collection('courses'),
    routines: db.collection('routines'),
    attendanceSessions: db.collection('attendance_sessions'),
    attendanceRecords: db.collection('attendance_records'),
    // Face verification. `face_profiles` holds biometric templates and must never be returned by an API.
    faceProfiles: db.collection('face_profiles'),
    faceChallenges: db.collection('face_challenges'),
    attendanceAttempts: db.collection('attendance_attempts'),
    // Academic coursework & study materials
    assignments: db.collection('assignments'),
    assignmentSubmissions: db.collection('assignment_submissions'),
    materials: db.collection('materials'),
  };

  const ensureIndex = async (collection, spec, options = {}) => {
    try {
      await collection.createIndex(spec, options);
    } catch (e) {
      console.warn(`[db] Could not create index ${JSON.stringify(spec)} on ${collection.collectionName}: ${e.message}`);
    }
  };

  const { routines, attendanceSessions, attendanceRecords, faceProfiles, faceChallenges, attendanceAttempts } = collections;
  const DAY = 24 * 60 * 60;

  await ensureIndex(routines, { day: 1, semester: 1, timeSlot: 1 }, { unique: true });

  await ensureIndex(attendanceSessions, { courseCode: 1, sessionDate: 1, timeSlot: 1 });
  // One session document per class occurrence. Partial so documents created before this key existed are ignored.
  await ensureIndex(
    attendanceSessions,
    { sessionKey: 1 },
    { unique: true, partialFilterExpression: { sessionKey: { $type: 'string' } } }
  );

  await ensureIndex(attendanceRecords, { sessionId: 1, studentEmail: 1 });
  // A student can have at most one record per class occurrence, even if two requests race.
  await ensureIndex(
    attendanceRecords,
    { sessionKey: 1, userId: 1 },
    { unique: true, partialFilterExpression: { sessionKey: { $type: 'string' }, userId: { $type: 'string' } } }
  );
  await ensureIndex(attendanceRecords, { userId: 1, markedAt: -1 });
  await ensureIndex(attendanceRecords, { studentEmail: 1, markedAt: -1 });
  await ensureIndex(attendanceRecords, { semester: 1, courseCode: 1, sessionDate: 1 });

  await ensureIndex(faceProfiles, { userId: 1 }, { unique: true });

  await ensureIndex(faceChallenges, { createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

  await ensureIndex(attendanceAttempts, { userId: 1, scopeKey: 1, at: -1 });
  await ensureIndex(attendanceAttempts, { frameHashes: 1 });
  await ensureIndex(attendanceAttempts, { at: 1 }, { expireAfterSeconds: 30 * DAY });

  console.log('Successfully connected to MongoDB!');
  return { db, collections };
};

const getDB = () => db;
const getCollections = () => collections;

module.exports = {
  connectDB,
  getDB,
  getCollections,
};
