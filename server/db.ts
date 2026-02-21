import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enemies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Enemy',
      sketch_png TEXT,
      model_glb BYTEA,
      idle_url TEXT,
      walk_url TEXT,
      attack_url TEXT,
      death_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Database tables initialized');
}

export default pool;
