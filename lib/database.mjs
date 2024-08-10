import postgres from 'postgres'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv';

dotenv.config();

const dbConfig =  {}
if (process.env.NODE_ENV === 'production') {
  const sslBundle = await fs.readFile(path.join(process.cwd(), 'eu-central-1-bundle.pem'))
  dbConfig.ssl = {
    require: process.env.NODE_ENV === 'production',
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    ca: sslBundle.toString(),
  }
}
const sql = postgres(process.env.DATABASE_URL, dbConfig)

export default sql