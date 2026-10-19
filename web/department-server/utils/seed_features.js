const { MongoClient } = require('mongodb');
require('dotenv').config({ path: __dirname + '/../.env' });

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'department_db');

  // Seed demo materials if empty
  const matCount = await db.collection('materials').countDocuments();
  if (matCount === 0) {
    await db.collection('materials').insertMany([
      {
        title: 'Lecture 01 - Distributed Systems Architectures & RPCs',
        course: 'CSE 4101',
        type: 'Lecture Slides (PDF)',
        semester: '7',
        teacherName: 'Dr. John Smith',
        teacherEmail: 'john.smith@cse.edu',
        filePath: '',
        originalName: 'CSE4101_Lecture01.pdf',
        fileSize: 2450000,
        date: 'Oct 18, 2026',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Lab Manual 02 - Linux Socket Programming & Multi-threading',
        course: 'CSE 4102',
        type: 'Lab Manual & Exercises',
        semester: '7',
        teacherName: 'Dr. John Smith',
        teacherEmail: 'john.smith@cse.edu',
        filePath: '',
        originalName: 'CSE4102_Lab02_Manual.pdf',
        fileSize: 1850000,
        date: 'Oct 17, 2026',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('Seeded demo materials!');
  }

  // Seed demo assignment if empty
  const assignCount = await db.collection('assignments').countDocuments();
  if (assignCount === 0) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);
    await db.collection('assignments').insertOne({
      title: 'Problem Set 01 - MapReduce & Chord DHT Protocol Simulation',
      description: 'Implement a distributed hash table simulation using Chord protocol with finger table routing in Python or Java. Submit your code archive and design report.',
      courseCode: 'CSE 4101',
      courseTitle: 'Distributed Systems',
      semester: '7',
      teacherName: 'Dr. John Smith',
      teacherEmail: 'john.smith@cse.edu',
      deadline: deadline,
      totalMarks: 20,
      filePath: '',
      originalName: '',
      fileSize: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Seeded demo assignment!');
  }

  await client.close();
  console.log('Done!');
  process.exit(0);
})();
