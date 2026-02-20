import { Router, Request, Response } from 'express';
import pool from '../db.js';

export const decorationsRouter = Router();

// List all decorations (without GLB data)
decorationsRouter.get('/decorations', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, sketch_png, created_at FROM decorations ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List decorations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single decoration's GLB model
decorationsRouter.get('/decorations/:id/model', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT model_glb FROM decorations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Decoration not found' });
      return;
    }

    res.set('Content-Type', 'model/gltf-binary');
    res.send(result.rows[0].model_glb);
  } catch (err) {
    console.error('Get decoration model error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
