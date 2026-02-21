import { Router, Request, Response } from 'express';

export const enemiesRouter = Router();

enemiesRouter.post('/forge-enemy', async (req: Request, res: Response) => {
  try {
    const { sketch } = req.body as { sketch: string };
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

    // Sketch -> polished image via Stability Sketch Control
    console.log('Converting sketch to polished sprite...');
    const sketchForm = new FormData();
    sketchForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'sketch.png');
    sketchForm.append(
      'prompt',
      'A 2D fantasy creature sprite, front-facing, full body, pixel art style, dark dungeon aesthetic, transparent background, single character, game enemy sprite, no text',
    );
    sketchForm.append(
      'negative_prompt',
      'blurry, low quality, multiple characters, text, watermark, background scene, 3D render, realistic photo',
    );
    sketchForm.append('control_strength', '0.7');
    sketchForm.append('output_format', 'png');

    const response = await fetch(
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

    if (!response.ok) {
      const errText = await response.text();
      console.error('Sketch-to-image error:', response.status, errText);
      res.status(502).json({ error: 'Sketch-to-image failed', details: errText });
      return;
    }

    const imageData = Buffer.from(await response.arrayBuffer());
    console.log('Sprite generated. Size:', imageData.length);

    res.set('Content-Type', 'image/png');
    res.send(imageData);
  } catch (err) {
    console.error('Forge enemy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
