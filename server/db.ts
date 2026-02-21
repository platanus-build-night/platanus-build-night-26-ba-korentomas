import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weapons (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Weapon',
      sketch_png TEXT,
      model_glb BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS enemies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Enemy',
      sketch_png TEXT,
      model_glb BYTEA,
      health INT DEFAULT 30,
      speed FLOAT DEFAULT 2,
      damage INT DEFAULT 10,
      points INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS decorations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Decoration',
      sketch_png TEXT,
      model_glb BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS favicons (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Favicon',
      sketch_png TEXT,
      favicon_png BYTEA,
      style VARCHAR(50) DEFAULT 'retro-8bit',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add sprite_png column to existing tables (safe if column already exists)
  await pool.query(`
    ALTER TABLE enemies ADD COLUMN IF NOT EXISTS sprite_png BYTEA;
    ALTER TABLE decorations ADD COLUMN IF NOT EXISTS sprite_png BYTEA;
  `);

  console.log('Database tables initialized');
}

export default pool;
