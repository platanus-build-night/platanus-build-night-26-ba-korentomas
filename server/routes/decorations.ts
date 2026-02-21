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

// Get a single decoration's sprite (PNG) or GLB model (backward compat)
decorationsRouter.get('/decorations/:id/model', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT sprite_png, model_glb FROM decorations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Decoration not found' });
      return;
    }

    const row = result.rows[0];
    if (row.sprite_png) {
      res.set('Content-Type', 'image/png');
      res.send(row.sprite_png);
    } else if (row.model_glb) {
      res.set('Content-Type', 'model/gltf-binary');
      res.send(row.model_glb);
    } else {
      res.status(404).json({ error: 'No model or sprite found for this decoration' });
    }
  } catch (err) {
    console.error('Get decoration model error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
