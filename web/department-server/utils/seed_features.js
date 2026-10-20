const { MongoClient } = require('mongodb');
require('dotenv').config({ path: __dirname + '/../.env' });

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'department_db');

  // No default materials or assignments - only published by teachers
  console.log('No default materials or assignments seeded.');

  await client.close();
  console.log('Done!');
  process.exit(0);
})();
