import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { forgeRouter } from './routes/forge.js';
import { weaponsRouter } from './routes/weapons.js';
import { faviconRouter } from './routes/favicon.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', forgeRouter);
app.use('/api', weaponsRouter);
app.use('/api', faviconRouter);

app.listen(PORT, () => {
  console.log(`Forge server running on http://localhost:${PORT}`);
});
