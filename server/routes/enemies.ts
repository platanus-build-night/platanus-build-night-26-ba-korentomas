import { Router, Request, Response } from 'express';
import pool from '../db.js';

export const enemiesRouter = Router();

// List all enemies (without GLB data)
enemiesRouter.get('/enemies', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, sketch_png, health, speed, damage, points, created_at FROM enemies ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List enemies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single enemy's GLB model
enemiesRouter.get('/enemies/:id/model', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT model_glb FROM enemies WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Enemy not found' });
      return;
    }

    res.set('Content-Type', 'model/gltf-binary');
    res.send(result.rows[0].model_glb);
  } catch (err) {
    console.error('Get enemy model error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
