import postgres from 'postgres'
import dotenv from 'dotenv';

dotenv.config();
let dbConfig = {}
// if (process.env.NODE_ENV === 'production') {
  dbConfig = {
    ssl: {
      rejectUnauthorized: false
    }
  }
// }
const sql = postgres(process.env.DATABASE_URL, dbConfig)

export default sql