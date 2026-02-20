import { Router, Request, Response } from 'express';
import pool from '../db.js';
import { optimizeGlb } from '../optimizeGlb.js';

export const enemiesRouter = Router();

interface MeshyTaskResponse {
  status: string;
  result?: string;
  progress?: number;
}

interface MeshyAnimationResult {
  status: string;
  result?: string;
}

async function pollMeshyTask(
  endpoint: string,
  taskId: string,
  apiKey: string,
  intervalMs = 2000,
  timeoutMs = 120000,
): Promise<string> {
  const url = `https://api.meshy.ai/openapi/v1/${endpoint}/${taskId}`;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Meshy poll failed (${resp.status}): ${errText}`);
    }

    const data = (await resp.json()) as MeshyTaskResponse;

    if (data.status === 'SUCCEEDED') {
      if (!data.result) throw new Error('Meshy task succeeded but no result URL');
      return data.result;
    }

    if (data.status === 'FAILED' || data.status === 'EXPIRED') {
      throw new Error(`Meshy task ${data.status}`);
    }

    console.log(`  Polling ${endpoint}/${taskId}: ${data.status} (${data.progress ?? '?'}%)`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Meshy task timed out after ${timeoutMs / 1000}s`);
}

const ANIMATION_ACTIONS: Record<string, number> = {
  idle: 0,
  walk: 30,
  attack: 4,
  death: 8,
};

enemiesRouter.post('/forge-enemy', async (req: Request, res: Response) => {
  try {
    const { sketch, name } = req.body as { sketch: string; name?: string };
    if (!sketch) {
      res.status(400).json({ error: 'Missing sketch data' });
      return;
    }

    const stabilityKey = process.env.STABILITY_API_KEY;
    const meshyKey = process.env.MESHY_API_KEY;

    if (!stabilityKey || !meshyKey) {
      res.status(500).json({ error: 'Missing API keys' });
      return;
    }

    const base64Data = sketch.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Step 1: Sketch -> realistic image via Stability Sketch Control
    console.log('Step 1: Converting sketch to realistic image...');
    const sketchForm = new FormData();
    sketchForm.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'sketch.png');
    sketchForm.append(
      'prompt',
      'A 3D rendered fantasy creature or character, full body, standing pose, plain white background, single figure, game asset, no text',
    );
    sketchForm.append(
      'negative_prompt',
      'blurry, low quality, multiple objects, text, watermark, background scene, glowing effects, particle effects, aura, magic effects',
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
    sf3dForm.append('image', new Blob([renderedImage], { type: 'image/png' }), 'creature.png');
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

    // Step 4: Send to Meshy Rigging
    console.log('Step 4: Rigging via Meshy...');
    const glbBase64 = glbBuffer.toString('base64');
    const rigResponse = await fetch('https://api.meshy.ai/openapi/v1/rigging', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${meshyKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_url: `data:model/gltf-binary;base64,${glbBase64}`,
        height_meters: 1.7,
      }),
    });

    if (!rigResponse.ok) {
      const errText = await rigResponse.text();
      console.error('Meshy rigging error:', rigResponse.status, errText);
      res.status(502).json({ error: 'Meshy rigging failed', details: errText });
      return;
    }

    const rigData = (await rigResponse.json()) as { result: string };
    const rigTaskId = rigData.result;
    console.log('Step 4: Rigging task submitted:', rigTaskId);

    // Step 5: Poll rigging until complete
    console.log('Step 5: Polling rigging task...');
    const riggedModelUrl = await pollMeshyTask('rigging', rigTaskId, meshyKey);
    console.log('Step 5 done. Rigged model URL:', riggedModelUrl);

    // Step 6: Launch 4 parallel animation requests
    console.log('Step 6: Launching animation tasks...');
    const animationEntries = Object.entries(ANIMATION_ACTIONS);
    const animTasks = await Promise.all(
      animationEntries.map(async ([animName, actionId]) => {
        const animResp = await fetch('https://api.meshy.ai/openapi/v1/animations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${meshyKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_url: riggedModelUrl,
            action_id: actionId,
          }),
        });

        if (!animResp.ok) {
          const errText = await animResp.text();
          throw new Error(`Animation request failed for ${animName}: ${errText}`);
        }

        const animData = (await animResp.json()) as { result: string };
        console.log(`  Animation task for ${animName} (action ${actionId}): ${animData.result}`);
        return { name: animName, taskId: animData.result };
      }),
    );
    console.log('Step 6 done. All animation tasks submitted.');

    // Step 7: Poll each animation task until complete
    console.log('Step 7: Polling animation tasks...');
    const animationResults = await Promise.all(
      animTasks.map(async ({ name: animName, taskId }) => {
        console.log(`  Polling animation: ${animName} (${taskId})`);
        const resultUrl = await pollMeshyTask('animations', taskId, meshyKey);
        return { name: animName, url: resultUrl };
      }),
    );
    console.log('Step 7 done. All animations complete.');

    // Build response with animation URLs
    const animations: Record<string, string> = {};
    for (const { name: animName, url } of animationResults) {
      animations[animName] = url;
    }

    // Store in DB
    const enemyName = name || 'Unnamed Enemy';
    const result = await pool.query(
      `INSERT INTO enemies (name, sketch_png, model_glb, idle_url, walk_url, attack_url, death_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name`,
      [
        enemyName,
        base64Data,
        glbBuffer,
        animations['idle'] || null,
        animations['walk'] || null,
        animations['attack'] || null,
        animations['death'] || null,
      ],
    );

    const enemyId = result.rows[0].id;
    console.log(`Enemy saved to DB: id=${enemyId}, name=${enemyName}`);

    // Step 8: Return JSON with animation URLs
    res.json({
      id: enemyId,
      name: enemyName,
      riggedModelUrl,
      animations,
    });
  } catch (err) {
    console.error('Forge enemy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
