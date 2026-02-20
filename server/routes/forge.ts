import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { optimizeGlb } from '../optimizeGlb.js';

export const forgeRouter = Router();

const WEAPON_LABELS: Record<string, string> = {
  sword: 'a single sword',
  staff: 'a magical staff or baculus',
  'dual-daggers': 'a pair of crossed daggers',
  hammer: 'a war hammer',
  axe: 'a battle axe',
  bow: 'a longbow',
  spear: 'a spear or lance',
  mace: 'a flanged mace',
};

forgeRouter.post('/forge', async (req: Request, res: Response) => {
  try {
    const { sketch, name, weaponType, description } = req.body as {
      sketch: string;
      name?: string;
      weaponType?: string;
      description?: string;
    };
    if (!sketch) {
      res.status(400).json({ error: 'Missing sketch data' });
      return;
    }

    const base64Data = sketch.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const apiKey = process.env.STABILITY_API_KEY;

    // Build prompt based on weapon type and optional description
    const resolvedType = weaponType || 'sword';
    const weaponLabel = WEAPON_LABELS[resolvedType] || WEAPON_LABELS['sword'];
    const prompt = description
      ? `A 3D rendered fantasy ${weaponLabel}, ${description}, on a plain white background, centered, single object, high detail, game asset, no text`
      : `A 3D rendered fantasy ${weaponLabel} on a plain white background, centered, single object, high detail, game asset, no text`;

    // Step 1: Sketch → Realistic weapon image via Stability Sketch Control
    console.log('Step 1: Converting sketch to realistic image...');
    const sketchForm = new FormData();
    sketchForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'sketch.png');
    sketchForm.append('prompt', prompt);
    sketchForm.append('negative_prompt', 'blurry, low quality, multiple objects, text, watermark, background scene, glowing effects, particle effects, aura, magic effects');
    sketchForm.append('control_strength', '0.7');
    sketchForm.append('output_format', 'png');
    sketchForm.append('style_preset', '3d-model');

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
      console.error('Sketch-to-image error:', sketchResponse.status, errText);
      res.status(502).json({ error: 'Sketch-to-image failed', details: errText });
      return;
    }

    const renderedImage = Buffer.from(await sketchResponse.arrayBuffer());
    console.log('Step 1 done. Rendered image size:', renderedImage.length);

    // Step 2: Realistic image → 3D model via SF3D (use 512 textures for smaller output)
    console.log('Step 2: Converting image to 3D model...');
    const sf3dForm = new FormData();
    sf3dForm.append('image', new Blob([renderedImage], { type: 'image/png' }), 'weapon.png');
    sf3dForm.append('texture_resolution', '512');

    const sfResponse = await fetch(
      'https://api.stability.ai/v2beta/3d/stable-fast-3d',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: sf3dForm,
      }
    );

    if (!sfResponse.ok) {
      const errText = await sfResponse.text();
      console.error('SF3D error:', sfResponse.status, errText);
      res.status(502).json({ error: 'SF3D API failed', details: errText });
      return;
    }

    const rawGlb = Buffer.from(await sfResponse.arrayBuffer());
    console.log('Step 2 done. Raw GLB size:', rawGlb.length);

    // Step 3: Optimize — simplify mesh, shrink textures, quantize
    console.log('Step 3: Optimizing mesh...');
    const glbBuffer = await optimizeGlb(rawGlb);
    console.log('Step 3 done. Optimized GLB size:', glbBuffer.length,
      `(${Math.round((1 - glbBuffer.length / rawGlb.length) * 100)}% reduction)`);

    // Store in DB
    const result = await pool.query(
      'INSERT INTO weapons (name, sketch_png, model_glb) VALUES ($1, $2, $3) RETURNING id, name, created_at',
      [name || 'Unnamed Weapon', base64Data, glbBuffer]
    );

    const weapon = result.rows[0];

    res.set({
      'Content-Type': 'model/gltf-binary',
      'X-Weapon-Id': String(weapon.id),
      'X-Weapon-Name': weapon.name,
    });
    res.send(glbBuffer);
  } catch (err) {
    console.error('Forge error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
