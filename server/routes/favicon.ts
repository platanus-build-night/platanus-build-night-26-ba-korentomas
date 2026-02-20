import { Router, Request, Response } from 'express';
import pool from '../db.js';

export const faviconRouter = Router();

const STYLE_PROMPTS: Record<string, string> = {
  'dark-dungeon': 'dark stone dungeon aesthetic, torchlit, moody shadows',
  'retro-8bit': '8-bit retro pixel art style, classic NES color palette',
  'neon-glow': 'neon glowing outlines, cyberpunk dark background',
  'parchment': 'hand-drawn on aged parchment, ink sketch style',
  'fire-lava': 'fiery lava colors, ember particles, molten aesthetic',
};

faviconRouter.post('/favicon', async (req: Request, res: Response) => {
  try {
    const { sketch, name, style, description } = req.body as {
      sketch: string;
      name?: string;
      style?: string;
      description?: string;
    };
    if (!sketch) {
      res.status(400).json({ error: 'Missing sketch data' });
      return;
    }

    const base64Data = sketch.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const apiKey = process.env.STABILITY_API_KEY;

    const resolvedStyle = style || 'retro-8bit';
    const styleDesc = STYLE_PROMPTS[resolvedStyle] || STYLE_PROMPTS['retro-8bit'];
    const userDesc = description ? `, ${description}` : '';

    const prompt = `A pixel art favicon icon, 32x32 pixels, ${styleDesc}${userDesc}, clean edges, single centered icon, transparent background, game icon, no text, no border`;

    console.log('Favicon forge: Converting sketch to pixel art icon...');
    const sketchForm = new FormData();
    sketchForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'sketch.png');
    sketchForm.append('prompt', prompt);
    sketchForm.append('negative_prompt', 'blurry, low quality, multiple objects, text, watermark, photo, realistic, 3d render');
    sketchForm.append('control_strength', '0.7');
    sketchForm.append('output_format', 'png');
    sketchForm.append('style_preset', 'pixel-art');

    const sketchResponse = await fetch(
      'https://api.stability.ai/v2beta/stable-image/control/sketch',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'image/*',
        },
        body: sketchForm,
      }
    );

    if (!sketchResponse.ok) {
      const errText = await sketchResponse.text();
      console.error('Favicon sketch-to-image error:', sketchResponse.status, errText);
      res.status(502).json({ error: 'Sketch-to-image failed', details: errText });
      return;
    }

    const renderedImage = Buffer.from(await sketchResponse.arrayBuffer());
    console.log('Favicon forge done. Image size:', renderedImage.length);

    // Store in DB
    const result = await pool.query(
      'INSERT INTO favicons (name, sketch_png, favicon_png, style) VALUES ($1, $2, $3, $4) RETURNING id, name, created_at',
      [name || 'Unnamed Favicon', base64Data, renderedImage, resolvedStyle]
    );

    const favicon = result.rows[0];

    res.set({
      'Content-Type': 'image/png',
      'X-Favicon-Id': String(favicon.id),
      'X-Favicon-Name': favicon.name,
    });
    res.send(renderedImage);
  } catch (err) {
    console.error('Favicon forge error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all favicons (without image data)
faviconRouter.get('/favicons', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, sketch_png, style, created_at FROM favicons ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List favicons error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single favicon image
faviconRouter.get('/favicons/:id/image', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT favicon_png FROM favicons WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Favicon not found' });
      return;
    }

    res.set('Content-Type', 'image/png');
    res.send(result.rows[0].favicon_png);
  } catch (err) {
    console.error('Get favicon image error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
