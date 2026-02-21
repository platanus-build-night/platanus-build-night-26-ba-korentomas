import { Router, Request, Response } from 'express';
import { optimizeGlb } from '../optimizeGlb.js';

export const forge3dRouter = Router();

const CATEGORY_PROMPTS: Record<string, string> = {
  weapon:
    'A 3D rendered fantasy weapon on a plain white background, centered, single object, high detail, game asset, no text',
  decoration:
    'A 3D rendered fantasy dungeon decoration on a plain white background, centered, single object, high detail, game asset, no text',
};

forge3dRouter.post('/forge-3d', async (req: Request, res: Response) => {
  try {
    const { sketch, category } = req.body as { sketch: string; category?: string };
    if (!sketch) {
      res.status(400).json({ error: 'Missing sketch data' });
      return;
    }

    const stabilityKey = process.env.STABILITY_API_KEY;
    if (!stabilityKey) {
      res.status(500).json({ error: 'Missing STABILITY_API_KEY' });
      return;
    }

    const base64Data = sketch.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const prompt = CATEGORY_PROMPTS[category || 'decoration'] || CATEGORY_PROMPTS['decoration'];

    // Step 1: Sketch -> realistic image via Stability Sketch Control
    console.log('Step 1: Converting sketch to realistic image...');
    const sketchForm = new FormData();
    sketchForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'sketch.png');
    sketchForm.append('prompt', prompt);
    sketchForm.append(
      'negative_prompt',
      'blurry, low quality, multiple objects, text, watermark, background scene, glowing effects, particle effects',
    );
    sketchForm.append('control_strength', '0.7');
    sketchForm.append('output_format', 'png');
    sketchForm.append('style_preset', '3d-model');

    const sketchResponse = await fetch(
      'https://api.stability.ai/v2beta/stable-image/control/sketch',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stabilityKey}`,
          Accept: 'image/*',
        },
        body: sketchForm,
      },
    );

    if (!sketchResponse.ok) {
      const errText = await sketchResponse.text();
      console.error('Sketch-to-image error:', sketchResponse.status, errText);
      res.status(502).json({ error: 'Sketch-to-image failed', details: errText });
      return;
    }

    const renderedImage = Buffer.from(await sketchResponse.arrayBuffer());
    console.log('Step 1 done. Rendered image size:', renderedImage.length);

    // Step 2: Realistic image -> 3D model via SF3D
    console.log('Step 2: Converting image to 3D model...');
    const sf3dForm = new FormData();
    sf3dForm.append('image', new Blob([renderedImage], { type: 'image/png' }), 'object.png');
    sf3dForm.append('texture_resolution', '512');

    const sfResponse = await fetch('https://api.stability.ai/v2beta/3d/stable-fast-3d', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stabilityKey}` },
      body: sf3dForm,
    });

    if (!sfResponse.ok) {
      const errText = await sfResponse.text();
      console.error('SF3D error:', sfResponse.status, errText);
      res.status(502).json({ error: 'SF3D API failed', details: errText });
      return;
    }

    const rawGlb = Buffer.from(await sfResponse.arrayBuffer());
    console.log('Step 2 done. Raw GLB size:', rawGlb.length);

    // Step 3: Optimize mesh
    console.log('Step 3: Optimizing mesh...');
    const glbBuffer = await optimizeGlb(rawGlb);
    console.log(
      'Step 3 done. Optimized GLB size:',
      glbBuffer.length,
      `(${Math.round((1 - glbBuffer.length / rawGlb.length) * 100)}% reduction)`,
    );

    res.set('Content-Type', 'model/gltf-binary');
    res.send(glbBuffer);
  } catch (err) {
    console.error('Forge 3D error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
