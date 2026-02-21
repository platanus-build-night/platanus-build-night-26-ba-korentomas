import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db.js';

export const adminRouter = Router();

/** Middleware: require X-Admin-Secret header matching ADMIN_SECRET env var */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-admin-secret'] as string | undefined;
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    res.status(503).json({ error: 'Admin access not configured' });
    return;
  }
  if (!secret || secret !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

adminRouter.use('/admin', requireAdmin);

/**
 * POST /api/admin/auth
 * Validates the admin secret. Returns 200 if correct, 401 if not.
 */
adminRouter.post('/admin/auth', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

/**
 * GET /api/admin/creations
 * Returns all creations with metadata (no image blobs for speed).
 * Query: ?category= to filter
 */
adminRouter.get('/admin/creations', async (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';

    interface AdminItem {
      id: number;
      name: string;
      category: string;
      subtype: string;
      has_sketch: boolean;
      has_output: boolean;
      created_at: string;
      thumbnail: string | null;
    }

    const items: AdminItem[] = [];

    if (!category || category === 'weapon') {
      const result = await pool.query(
        'SELECT id, name, subtype, created_at, sketch_png IS NOT NULL as has_sketch, output_png IS NOT NULL as has_output, sketch_png FROM weapons ORDER BY created_at DESC'
      );
      for (const row of result.rows) {
        items.push({
          id: row.id,
          name: row.name,
          category: 'weapon',
          subtype: row.subtype || 'sword',
          has_sketch: row.has_sketch,
          has_output: row.has_output,
          created_at: row.created_at,
          thumbnail: row.sketch_png ? `data:image/png;base64,${row.sketch_png}` : null,
        });
      }
    }

    if (!category || category === 'enemy') {
      const result = await pool.query(
        'SELECT id, name, subtype, created_at, sketch_png IS NOT NULL as has_sketch, sprite_png IS NOT NULL as has_output, sketch_png FROM enemies ORDER BY created_at DESC'
      );
      for (const row of result.rows) {
        items.push({
          id: row.id,
          name: row.name,
          category: 'enemy',
          subtype: row.subtype || 'beast',
          has_sketch: row.has_sketch,
          has_output: row.has_output,
          created_at: row.created_at,
          thumbnail: row.sketch_png ? `data:image/png;base64,${row.sketch_png}` : null,
        });
      }
    }

    if (!category || category === 'decoration') {
      const result = await pool.query(
        'SELECT id, name, subtype, created_at, sketch_png IS NOT NULL as has_sketch, sprite_png IS NOT NULL as has_output, sketch_png FROM decorations ORDER BY created_at DESC'
      );
      for (const row of result.rows) {
        items.push({
          id: row.id,
          name: row.name,
          category: 'decoration',
          subtype: row.subtype || 'crate',
          has_sketch: row.has_sketch,
          has_output: row.has_output,
          created_at: row.created_at,
          thumbnail: row.sketch_png ? `data:image/png;base64,${row.sketch_png}` : null,
        });
      }
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/stats
 * Returns counts per category.
 */
adminRouter.get('/admin/stats', async (_req: Request, res: Response) => {
  try {
    const [weapons, enemies, decorations] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM weapons'),
      pool.query('SELECT COUNT(*) as count FROM enemies'),
      pool.query('SELECT COUNT(*) as count FROM decorations'),
    ]);
    res.json({
      weapons: parseInt(weapons.rows[0].count, 10),
      enemies: parseInt(enemies.rows[0].count, 10),
      decorations: parseInt(decorations.rows[0].count, 10),
      total: parseInt(weapons.rows[0].count, 10) + parseInt(enemies.rows[0].count, 10) + parseInt(decorations.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/creations/:category/:id
 * Deletes a single creation.
 */
adminRouter.delete('/admin/creations/:category/:id', async (req: Request, res: Response) => {
  try {
    const { category, id } = req.params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const tableMap: Record<string, string> = {
      weapon: 'weapons',
      enemy: 'enemies',
      decoration: 'decorations',
    };
    const table = tableMap[category];
    if (!table) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }

    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id, name`, [numId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    console.log(`Admin deleted ${category} #${numId}: ${result.rows[0].name}`);
    res.json({ deleted: true, id: numId, name: result.rows[0].name });
  } catch (err) {
    console.error('Admin delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/creations/bulk
 * Deletes multiple creations at once.
 * Body: { items: [{ category: string, id: number }] }
 */
adminRouter.delete('/admin/creations/bulk', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { category: string; id: number }[] };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'No items provided' });
      return;
    }

    const tableMap: Record<string, string> = {
      weapon: 'weapons',
      enemy: 'enemies',
      decoration: 'decorations',
    };

    let deleted = 0;
    for (const item of items) {
      const table = tableMap[item.category];
      if (!table) continue;
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [item.id]);
      if (result.rowCount && result.rowCount > 0) deleted++;
    }

    console.log(`Admin bulk deleted ${deleted}/${items.length} items`);
    res.json({ deleted, requested: items.length });
  } catch (err) {
    console.error('Admin bulk delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
