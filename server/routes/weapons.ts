import { Router, Request, Response } from 'express';
import pool from '../db.js';

export const weaponsRouter = Router();

// List all weapons (without GLB data)
weaponsRouter.get('/weapons', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, sketch_png, created_at FROM weapons ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List weapons error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single weapon's GLB model
weaponsRouter.get('/weapons/:id/model', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT model_glb FROM weapons WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Weapon not found' });
      return;
    }

    res.set('Content-Type', 'model/gltf-binary');
    res.send(result.rows[0].model_glb);
  } catch (err) {
    console.error('Get weapon model error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
