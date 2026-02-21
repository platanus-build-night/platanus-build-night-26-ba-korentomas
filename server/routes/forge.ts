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

type ForgeCategory = 'weapon' | 'enemy' | 'decoration';

interface PromptConfig {
  prompt: string;
  negative_prompt: string;
  style_preset: string;
  control_strength: string;
}

function buildPromptConfig(category: ForgeCategory, description?: string, weaponType?: string): PromptConfig {
  if (category === 'enemy') {
    const desc = description || 'a fearsome dungeon creature';
    return {
      prompt: `A 2D fantasy creature sprite, front-facing, full body, pixel art style, dark dungeon aesthetic, transparent background, single character, game enemy sprite, ${desc}, no text`,
      negative_prompt: 'blurry, low quality, multiple characters, text, watermark, background scene, 3D render, realistic photo',
      style_preset: 'pixel-art',
      control_strength: '0.7',
    };
  }
  if (category === 'decoration') {
    const desc = description || 'a stone dungeon decoration';
    return {
      prompt: `A 2D painting for a fantasy dungeon wall, ${desc}, painterly style, framed artwork aesthetic, no text, no border`,
      negative_prompt: 'blurry, low quality, multiple characters, text, watermark, background scene, 3D render, realistic photo',
      style_preset: 'fantasy-art',
      control_strength: '0.7',
    };
  }
  // weapon (default)
  const resolvedType = weaponType || 'sword';
  const weaponLabel = WEAPON_LABELS[resolvedType] || WEAPON_LABELS['sword'];
  const prompt = description
    ? `A 3D rendered fantasy ${weaponLabel}, ${description}, on a plain white background, centered, single object, high detail, game asset, no text`
    : `A 3D rendered fantasy ${weaponLabel} on a plain white background, centered, single object, high detail, game asset, no text`;
  return {
    prompt,
    negative_prompt: 'blurry, low quality, multiple objects, text, watermark, background scene, glowing effects, particle effects, aura, magic effects',
    style_preset: '3d-model',
    control_strength: '0.7',
  };
}

forgeRouter.post('/forge', async (req: Request, res: Response) => {
  try {
    const { sketch, name, weaponType, description, category: rawCategory } = req.body as {
      sketch: string;
      name?: string;
      weaponType?: string;
      description?: string;
      category?: string;
    };
    if (!sketch) {
      res.status(400).json({ error: 'Missing sketch data' });
      return;
    }

    const category: ForgeCategory =
      rawCategory === 'enemy' || rawCategory === 'decoration' ? rawCategory : 'weapon';

    const base64Data = sketch.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const apiKey = process.env.STABILITY_API_KEY;

    const promptConfig = buildPromptConfig(category, description, weaponType);

    // Step 1: Sketch → image via Stability Sketch Control
    console.log('Step 1: Converting sketch to image...');
    const sketchForm = new FormData();
    sketchForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'sketch.png');
    sketchForm.append('prompt', promptConfig.prompt);
    sketchForm.append('negative_prompt', promptConfig.negative_prompt);
    sketchForm.append('control_strength', promptConfig.control_strength);
    sketchForm.append('output_format', 'png');
    sketchForm.append('style_preset', promptConfig.style_preset);

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

    // For enemies and decorations, return the PNG sprite directly (skip SF3D + optimize)
    if (category === 'enemy' || category === 'decoration') {
      const table = category === 'enemy' ? 'enemies' : 'decorations';
      const defaultName = category === 'enemy' ? 'Unnamed Enemy' : 'Unnamed Decoration';
      const result = await pool.query(
        `INSERT INTO ${table} (name, sketch_png, sprite_png) VALUES ($1, $2, $3) RETURNING id, name`,
        [name || defaultName, base64Data, renderedImage]
      );
      const itemId = result.rows[0].id;
      const itemName = result.rows[0].name;

      res.set({
        'Content-Type': 'image/png',
        'X-Item-Id': String(itemId),
        'X-Item-Name': itemName,
        'X-Item-Category': category,
      });
      res.send(renderedImage);
      return;
    }

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

    // Store weapon in DB (enemies/decorations already handled above)
    const result = await pool.query(
      'INSERT INTO weapons (name, sketch_png, model_glb) VALUES ($1, $2, $3) RETURNING id, name',
      [name || 'Unnamed Weapon', base64Data, glbBuffer]
    );
    const itemId = result.rows[0].id;
    const itemName = result.rows[0].name;

    res.set({
      'Content-Type': 'model/gltf-binary',
      'X-Item-Id': String(itemId),
      'X-Item-Name': itemName,
      'X-Item-Category': category,
      'X-Weapon-Id': String(itemId),
      'X-Weapon-Name': itemName,
    });
    res.send(glbBuffer);
  } catch (err) {
    console.error('Forge error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
