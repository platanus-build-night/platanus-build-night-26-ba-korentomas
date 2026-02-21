import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import { forgeRouter } from './routes/forge.js';
import { weaponsRouter } from './routes/weapons.js';
import { enemiesRouter } from './routes/enemies.js';
import { decorationsRouter } from './routes/decorations.js';
import { faviconRouter } from './routes/favicon.js';
import { galleryRouter } from './routes/gallery.js';
import { adminRouter } from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', forgeRouter);
app.use('/api', weaponsRouter);
app.use('/api', enemiesRouter);
app.use('/api', decorationsRouter);
app.use('/api', faviconRouter);
app.use('/api', galleryRouter);
app.use('/api', adminRouter);

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
