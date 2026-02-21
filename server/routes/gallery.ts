import { Router, Request, Response } from 'express';
import pool from '../db.js';

export const galleryRouter = Router();

interface GalleryItem {
  id: number;
  name: string;
  category: 'weapon' | 'enemy' | 'decoration';
  sketch: string | null;
  output: string | null;
  created_at: string;
}

/**
 * GET /api/gallery
 *
 * Returns all creations across weapons, enemies, and decorations as a
 * unified list sorted by most recent first.
 *
 * Query params:
 *   ?search=   — case-insensitive name filter (ILIKE)
 *   ?category= — filter by category (weapon | enemy | decoration)
 */
galleryRouter.get('/gallery', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';

    const items: GalleryItem[] = [];
    const searchFilter = search ? `%${search}%` : null;

    // Weapons — thumbnail from sketch_png (base64 text stored directly)
    if (!category || category === 'weapon') {
      const weaponQuery = searchFilter
        ? 'SELECT id, name, sketch_png, created_at FROM weapons WHERE name ILIKE $1 ORDER BY created_at DESC'
        : 'SELECT id, name, sketch_png, created_at FROM weapons ORDER BY created_at DESC';
      const weaponParams = searchFilter ? [searchFilter] : [];
      const weaponResult = await pool.query(weaponQuery, weaponParams);

      for (const row of weaponResult.rows) {
        const sketchUrl = row.sketch_png
          ? `data:image/png;base64,${row.sketch_png}`
          : null;
        items.push({
          id: row.id,
          name: row.name,
          category: 'weapon',
          sketch: sketchUrl,
          output: sketchUrl, // weapons don't store a separate rendered image
          created_at: row.created_at,
        });
      }
    }

    // Enemies — thumbnail from sprite_png (bytea)
    if (!category || category === 'enemy') {
      const enemyQuery = searchFilter
        ? 'SELECT id, name, sprite_png, sketch_png, created_at FROM enemies WHERE name ILIKE $1 ORDER BY created_at DESC'
        : 'SELECT id, name, sprite_png, sketch_png, created_at FROM enemies ORDER BY created_at DESC';
      const enemyParams = searchFilter ? [searchFilter] : [];
      const enemyResult = await pool.query(enemyQuery, enemyParams);

      for (const row of enemyResult.rows) {
        const sketchUrl = row.sketch_png
          ? `data:image/png;base64,${row.sketch_png}`
          : null;
        let outputUrl: string | null = null;
        if (row.sprite_png) {
          const buf = Buffer.isBuffer(row.sprite_png)
            ? row.sprite_png
            : Buffer.from(row.sprite_png);
          outputUrl = `data:image/png;base64,${buf.toString('base64')}`;
        }
        items.push({
          id: row.id,
          name: row.name,
          category: 'enemy',
          sketch: sketchUrl,
          output: outputUrl,
          created_at: row.created_at,
        });
      }
    }

    // Decorations — thumbnail from sprite_png (bytea)
    if (!category || category === 'decoration') {
      const decoQuery = searchFilter
        ? 'SELECT id, name, sprite_png, sketch_png, created_at FROM decorations WHERE name ILIKE $1 ORDER BY created_at DESC'
        : 'SELECT id, name, sprite_png, sketch_png, created_at FROM decorations ORDER BY created_at DESC';
      const decoParams = searchFilter ? [searchFilter] : [];
      const decoResult = await pool.query(decoQuery, decoParams);

      for (const row of decoResult.rows) {
        const sketchUrl = row.sketch_png
          ? `data:image/png;base64,${row.sketch_png}`
          : null;
        let outputUrl: string | null = null;
        if (row.sprite_png) {
          const buf = Buffer.isBuffer(row.sprite_png)
            ? row.sprite_png
            : Buffer.from(row.sprite_png);
          outputUrl = `data:image/png;base64,${buf.toString('base64')}`;
        }
        items.push({
          id: row.id,
          name: row.name,
          category: 'decoration',
          sketch: sketchUrl,
          output: outputUrl,
          created_at: row.created_at,
        });
      }
    }

    // Sort all items by created_at descending (most recent first)
    items.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });

    res.json(items);
  } catch (err) {
    console.error('Gallery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
