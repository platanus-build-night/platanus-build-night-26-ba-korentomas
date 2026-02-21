import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { enemiesRouter } from './routes/enemies.js';
import { forge3dRouter } from './routes/forge3d.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', enemiesRouter);
app.use('/api', forge3dRouter);

app.listen(PORT, () => {
  console.log(`Enemy forge server running on http://localhost:${PORT}`);
});
