import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import { forgeRouter } from './routes/forge.js';
import { weaponsRouter } from './routes/weapons.js';
import { enemiesRouter } from './routes/enemies.js';
import { decorationsRouter } from './routes/decorations.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', forgeRouter);
app.use('/api', weaponsRouter);
app.use('/api', enemiesRouter);
app.use('/api', decorationsRouter);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Forge server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
