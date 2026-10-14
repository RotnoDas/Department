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
  };

  try {
    await collections.routines.createIndex({ day: 1, semester: 1, timeSlot: 1 }, { unique: true });
  } catch (e) {
    // index may already exist
  }

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
