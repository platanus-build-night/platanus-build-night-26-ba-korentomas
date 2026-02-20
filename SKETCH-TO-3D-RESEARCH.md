# Sketch-to-3D Weapon Forging System: Research

> Research compiled Feb 2026 for DungeonSlopper

## Concept

Players find weapon blueprints in the dungeon, draw a line sketch of the weapon on a canvas overlay, and an AI model converts that sketch into a 3D model (GLB) that gets loaded into the Three.js scene as their new weapon.

---

## Table of Contents

1. [AI Services & APIs](#1-ai-services--apis)
2. [Open Source Models (Self-Hostable)](#2-open-source-models-self-hostable)
3. [Sketch Handling: Which Models Work Best](#3-sketch-handling-which-models-work-best)
4. [Speed Comparison](#4-speed-comparison)
5. [Cost Comparison](#5-cost-comparison)
6. [Browser Drawing Interface](#6-browser-drawing-interface)
7. [Blueprint / Template System](#7-blueprint--template-system)
8. [Full Pipeline Architecture](#8-full-pipeline-architecture)
9. [Three.js Model Loading](#9-threejs-model-loading)
10. [Similar Games & Projects](#10-similar-games--projects)
11. [Recommendations for DungeonSlopper](#11-recommendations-for-dungeon-slopper)

---

## 1. AI Services & APIs

### Meshy.ai — Best Sketch Support

- **API**: `POST https://api.meshy.ai/openapi/v1/image-to-3d`
- **Input**: `.jpg`, `.jpeg`, `.png` via URL or base64 data URI
- **Output**: GLB, FBX, OBJ, STL, USDZ, BLEND
- **Models**: `meshy-5`, `meshy-6`, `latest`
- **Quality**: 100–300,000 polygons (default 30K), quad or triangle topology, optional PBR maps (metallic, roughness, normal)
- **Speed**: ~60 seconds for 8 variants with Meshy 6
- **Pricing**: Pro $20/mo (1,000 credits), 20–30 credits per model ≈ **~$0.40–0.60/model**
- **Sketch support**: Has a [dedicated blog post on sketch-to-3D](https://www.meshy.ai/blog/sketch-to-3d). Bold, clear lines on white backgrounds work best.
- **Features**: Webhooks, SSE for real-time progress streaming, configurable polycount
- **Docs**: [docs.meshy.ai](https://docs.meshy.ai/en/api/image-to-3d)

### Tripo3D — Best Value

- **API**: `POST https://api.tripo3d.ai/v2/openapi/task`
- **Input**: Text, single images, multi-angle images, rough sketches
- **Output**: GLB, OBJ, FBX, USD, STL
- **Quality**: Clean quad-based topology designed for game pipelines. Ultra mode: up to 2M polygons with HD textures.
- **Speed**: 15–30s (Standard), 45–60s (Ultra)
- **Pricing**: Professional $15.90/mo (3,000 credits), ~40 credits/model ≈ **~$0.21/model**
- **Sketch support**: Explicitly supports rough sketches as input
- **SDK**: Python SDK available. No official JS SDK — REST API only.
- **Docs**: [platform.tripo3d.ai/docs](https://platform.tripo3d.ai/docs/quick-start)

### Hyper3D / Rodin — Highest Quality

- **API**: [developer.hyper3d.ai](https://developer.hyper3d.ai/)
- **Input**: Single/multi image, text. Has a dedicated **"Sketch" generation tier**.
- **Output**: GLTF, GLB, FBX, OBJ, USDZ, STL
- **Quality**: 10 billion parameter model (Gen-2). Animation-ready quad meshes, baked normals, HD PBR texture maps. SIGGRAPH Best Paper.
- **Speed**: Varies by tier — Sketch mode is fastest, Detail mode takes minutes
- **Pricing**: Creator $20–30/mo, Premium $99/mo ≈ **$0.30–0.40/model via fal.ai**
- **Sketch support**: Explicit "Sketch" quality tier for line drawings
- **Docs**: [developer.hyper3d.ai](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2)

### Stability AI SF3D — Fastest (Near Real-Time)

- **API**: `POST https://api.stability.ai/v2beta/3d/stable-fast-3d`
- **Input**: Image file (FormData upload)
- **Output**: GLB binary **returned directly in response** — no polling needed
- **Quality**: Lower than Meshy/Tripo, but acceptable for stylized games
- **Speed**: **~1 second** — synchronous response
- **Pricing**: 2 credits ≈ **~$0.04/model**
- **Sketch support**: Works with images; not sketch-optimized but fast enough to iterate
- **Open source**: [github.com/Stability-AI/stable-fast-3d](https://github.com/Stability-AI/stable-fast-3d) (self-hostable, 7GB VRAM)

### fal.ai — Unified JS Gateway (Recommended Integration)

Aggregates multiple 3D AI models under one API with a **JavaScript SDK**.

```bash
npm install @fal-ai/client
```

```typescript
import { fal } from "@fal-ai/client";

// Access Tripo, Rodin, Meshy, TripoSR, Hunyuan3D through ONE SDK
const result = await fal.subscribe("fal-ai/meshy/v6-preview/image-to-3d", {
  input: { image_url: "data:image/png;base64,..." }
});
```

**Available models on fal.ai:**
| Model | Price | Speed |
|-------|-------|-------|
| TripoSR | $0.07 | <1s |
| Hunyuan3D v2 | $0.05 | 15–30s |
| Tripo v2.5 | $0.20–0.40 | 15–60s |
| Meshy 5/6 | ~$0.40 | ~60s |
| Rodin 1.5/2 | $0.30–0.40 | varies |

**Links**: [fal.ai/3d-models](https://fal.ai/3d-models)

### Other Services

| Service | Notes |
|---------|-------|
| **Sloyd** | Text-only (no image input). Procedural/parametric. $12/mo. Near-instant. Good for standard game props. |
| **Kaedim** | Enterprise-only API. Human-polished output. |
| **CSM** | Acquired by Google (Jan 2026). API future uncertain — likely merging into Gemini/Google Cloud. |
| **Luma AI Genie** | Shifted focus to video gen. Availability uncertain. |
| **3D AI Studio** | Aggregator: Meshy + Rodin + Tripo + TRELLIS. $14/mo for 1,000 credits (~$0.014/model). |

---

## 2. Open Source Models (Self-Hostable)

### TRELLIS.2 (Microsoft) — Best Open Source Quality

- **License**: MIT
- **Params**: 4 billion
- **Output**: GLB with full PBR textures (up to 4096x4096), transparency support
- **Speed**: ~3s at 512³, ~17s at 1024³, ~60s at 1536³ (on H100)
- **GPU**: 24GB+ VRAM (A100, H100). Linux only.
- **GitHub**: [microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2)
- **HuggingFace**: [microsoft/TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B)

### TripoSR (Stability AI + Tripo) — Fastest Open Source

- **License**: MIT
- **Speed**: **Under 0.5 seconds** on A100
- **GPU**: ~6GB VRAM minimum. Runs on consumer GPUs (RTX 3080/4070). Can run on CPU.
- **Output**: Textured 3D mesh (OBJ, GLB)
- **Quality**: Lower than TRELLIS.2 but extremely fast and lightweight
- **GitHub**: [VAST-AI-Research/TripoSR](https://github.com/VAST-AI-Research/TripoSR)

### Hunyuan3D-2.1 (Tencent) — Strong Contender

- **License**: Open source (fully open-sourced with v2.1, June 2025)
- **Speed**: 500K+ vertex meshes in under 10 seconds on high-end GPUs
- **Output**: Full PBR materials
- **GitHub**: [Tencent-Hunyuan/Hunyuan3D-2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1)

### Others

| Model | Speed | Quality | License | Notes |
|-------|-------|---------|---------|-------|
| **SPAR3D** (Stability) | 0.7s | Better than TripoSR | Open | Point cloud + mesh reconstruction |
| **InstantMesh** (Tencent ARC) | ~10s | Good | Apache-2.0 | Multi-view diffusion |
| **Wonder3D** | 2–3 min | Highly detailed | MIT | Slow but detailed |
| **CRM** (Tsinghua) | — | Good 6-view consistency | Open | Three-stage pipeline |
| **Shap-E** (OpenAI) | Seconds | Low | MIT | Abandoned since 2023 |
| **Point-E** (OpenAI) | — | Very low | Open | Outputs point clouds, not meshes |

---

## 3. Sketch Handling: Which Models Work Best

### Tier 1: Purpose-Built for Sketches

| Service | Notes |
|---------|-------|
| **Meshy** | Dedicated sketch-to-3D workflow. Analyzes line weight, shading. Recommends clean line art. |
| **Tripo** | Explicitly advertises sketch input. Good at interpreting rough concepts. |
| **Rodin** | Has a "Sketch" quality tier specifically for quick concepts from line drawings. |

### Tier 2: Works With Sketches (With Caveats)

| Service | Notes |
|---------|-------|
| **TRELLIS.2** | Handles images broadly but not tuned for line art. |
| **TripoSR** | Feed-forward model; better with photos but handles clean sketches. |
| **SF3D** | Not sketch-optimized but 1-second speed allows rapid iteration. |

### Tier 3: Requires Photorealistic Input

| Service | Notes |
|---------|-------|
| **Shap-E** | Already low quality; sketches make it worse. |
| **SV3D / Zero123** | Designed for photorealistic novel-view synthesis. Line drawings confuse it. |

### Pro Tip: Two-Step Pipeline

Multiple sources recommend: **(1)** use an image generation model (Stable Diffusion, SDXL, Flux) to convert the sketch into a photorealistic render, then **(2)** feed that render into image-to-3D. This consistently produces better results than raw line drawings.

```
User sketch → Stable Diffusion (sketch-to-render) → Meshy/Tripo (render-to-3D)
```

This adds latency but dramatically improves quality.

---

## 4. Speed Comparison

| Rank | Model | Time | Type |
|------|-------|------|------|
| 1 | **TripoSR** (self-hosted) | ~0.5s | Open source, A100 |
| 2 | **SPAR3D** (self-hosted) | ~0.7s | Open source |
| 3 | **Stability SF3D** (API) | ~1s | Cloud, synchronous |
| 4 | **TRELLIS.2** (self-hosted, 512³) | ~3s | Open source, H100 |
| 5 | **Hunyuan3D** (fal.ai) | ~15–30s | Cloud |
| 6 | **Tripo** (API, Standard) | 15–30s | Cloud |
| 7 | **Meshy 6** (API) | ~60s | Cloud, 8 variants |
| 8 | **Tripo** (API, Ultra) | 45–60s | Cloud, 2M poly |
| 9 | **Rodin** (Detail tier) | Minutes | Cloud, highest fidelity |

---

## 5. Cost Comparison

| Service | Cost/Model | Monthly Plan |
|---------|-----------|--------------|
| **3D AI Studio** | ~$0.014 | $14/mo (aggregator) |
| **Stability SF3D** | ~$0.04 | Pay-per-use |
| **Hunyuan3D** (fal.ai) | ~$0.05 | Pay-per-use |
| **TripoSR** (fal.ai) | ~$0.07 | Pay-per-use |
| **Tripo** (direct) | ~$0.21 | From $15.90/mo |
| **Tripo** (fal.ai) | $0.20–0.40 | Pay-per-use |
| **Rodin** (fal.ai) | $0.30–0.40 | From $20/mo |
| **Meshy** (direct) | ~$0.40–0.60 | From $20/mo |
| **Self-hosted** (TripoSR/TRELLIS) | GPU cost only | MIT license |

---

## 6. Browser Drawing Interface

### Recommended: Vanilla HTML5 Canvas

No new dependencies needed. Fits the existing Vite + TypeScript stack.

```typescript
class SketchPad {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawing = false;

  constructor(width = 512, height = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.setupEvents();
  }

  private setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDraw());
    this.canvas.addEventListener('touchstart', (e) => this.startDraw(e));
    this.canvas.addEventListener('touchmove', (e) => this.draw(e));
    this.canvas.addEventListener('touchend', () => this.stopDraw());
  }

  exportPNG(): string {
    return this.canvas.toDataURL('image/png');
    // Returns "data:image/png;base64,..." — directly usable by APIs
  }

  exportBlob(): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }
}
```

### Library Alternatives

| Library | Size | Pros | Cons |
|---------|------|------|------|
| **Vanilla Canvas** | 0KB | Full control, no deps | Manual undo/redo |
| **Fabric.js** | ~300KB | Object model, SVG export, JSON serialize | Overkill for sketch pad |
| **Excalidraw** | Large | Hand-drawn aesthetic, great UX | Requires React |
| **Paper.js** | ~220KB | Vector paths | Conflicts with Three.js loop |
| **p5.js** | ~800KB | Creative coding | Own render loop conflicts |

**Verdict**: Vanilla Canvas is the right choice for DungeonSlopper.

---

## 7. Blueprint / Template System

### Weapon Template Overlays

Show a semi-transparent silhouette of the weapon category while the player draws:

```typescript
// Layer stack:
// 0: White background
// 1: Template silhouette (semi-transparent, removed on export)
// 2: Symmetry guide line (removed on export)
// 3: User's freehand strokes (exported to API)

function drawTemplate(ctx: CanvasRenderingContext2D, template: HTMLImageElement) {
  ctx.globalAlpha = 0.15;
  ctx.drawImage(template, 0, 0);
  ctx.globalAlpha = 1.0;
}

function exportSketchOnly(canvas: HTMLCanvasElement): string {
  // Re-render only the user's strokes on a clean white background
  const exportCanvas = document.createElement('canvas');
  // ... copy only stroke data, not template
  return exportCanvas.toDataURL('image/png');
}
```

### Design Patterns from Games

- **Drawn to Life (2007, DS)**: Players draw within a bounded template area. Template provides a silhouette outline. Drawing is constrained to a rectangular region.
- **Symmetry rulers**: For weapons like swords, provide a center axis that mirrors strokes in real-time. Dramatically improves sketch quality for AI interpretation.
- **Blueprint categories**: Sword, Axe, Staff, Shield, Dagger — each has a different template silhouette and bounding shape.

### Blueprint Discovery in Dungeon

Blueprints could be found as:
- Scroll pickups on pedestals
- Drops from enemies
- Hidden in secret rooms
- Rewards for puzzles

Each blueprint unlocks a weapon category template + AI prompt modifier (e.g., "medieval sword", "battle axe", "magic staff").

---

## 8. Full Pipeline Architecture

### End-to-End Flow

```
Blueprint found → Drawing UI opens → User sketches weapon → Canvas exports PNG
     ↓
"Forging" animation plays → Image sent to AI API → Poll for completion
     ↓
GLB downloaded → GLTFLoader.parseAsync() → Normalize scale/position → Add to scene
     ↓
Player equips new weapon
```

### Option A: Instant Forge (~1 second) — Stability SF3D

```typescript
async function forgeWeapon(sketchDataUrl: string): Promise<THREE.Group> {
  const blob = await (await fetch(sketchDataUrl)).blob();
  const formData = new FormData();
  formData.append('image', blob, 'sketch.png');
  formData.append('texture_resolution', '1024');

  const response = await fetch('https://api.stability.ai/v2beta/3d/stable-fast-3d', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: formData
  });

  const glbBuffer = await response.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(glbBuffer, './');
  return gltf.scene;
}
```

### Option B: High Quality (~15–60s) — Tripo via fal.ai

```typescript
import { fal } from "@fal-ai/client";

async function forgeWeaponHQ(sketchDataUrl: string): Promise<THREE.Group> {
  // Upload sketch and generate 3D model
  const result = await fal.subscribe("tripo3d/tripo/v2.5/image-to-3d", {
    input: { image_url: sketchDataUrl },
    onQueueUpdate: (update) => {
      // Update forging progress bar
      updateForgingUI(update.status);
    }
  });

  // Download the GLB
  const response = await fetch(result.model_mesh.url);
  const glbBuffer = await response.arrayBuffer();

  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(glbBuffer, './');
  return gltf.scene;
}
```

### Option C: Two-Step Pipeline (Best Quality)

```
Sketch → Stable Diffusion (sketch-to-photorealistic render) → Meshy/Tripo (render-to-3D)
```

This adds more latency but produces the best 3D models from crude sketches.

### Error Handling

```typescript
async function generateWeaponModel(sketch: string): Promise<THREE.Group> {
  if (isCanvasEmpty(canvas)) throw new Error('Empty sketch');

  try {
    const model = await forgeWeapon(sketch);
    if (!model.children.length) throw new Error('Empty model');
    return model;
  } catch (err) {
    console.error('Generation failed, using fallback:', err);
    return loadFallbackWeapon(); // Pre-loaded default weapon
  }
}
```

---

## 9. Three.js Model Loading

### GLTFLoader (Primary — for GLB files from APIs)

```typescript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// From ArrayBuffer (API response)
const gltf = await loader.parseAsync(glbArrayBuffer, './');
scene.add(gltf.scene);

// From URL
const gltf = await loader.loadAsync('path/to/model.glb');
scene.add(gltf.scene);

// From Blob URL
const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
const blobUrl = URL.createObjectURL(blob);
const gltf = await loader.loadAsync(blobUrl);
URL.revokeObjectURL(blobUrl);
```

### Normalizing AI-Generated Models

AI models vary wildly in scale, position, and materials:

```typescript
function integrateGeneratedModel(gltf: GLTF, targetSize = 1.0): THREE.Group {
  const model = gltf.scene;

  // Normalize scale
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  model.scale.multiplyScalar(targetSize / maxDim);

  // Center the model
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center.multiplyScalar(targetSize / maxDim));

  // Match dungeon aesthetic
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return model;
}
```

### Memory Cleanup (Critical)

```typescript
function disposeModel(model: THREE.Object3D) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v: any) => {
          if (v?.isTexture) { v.dispose(); v.source?.data?.close?.(); }
        });
        mat.dispose();
      });
    }
  });
  model.parent?.remove(model);
}
```

### Performance Tips

- Request **5K–10K polygons** via `target_polycount` for game use
- Request **512x512 textures** for retro dungeon aesthetic
- Use `THREE.LOD` if many user-generated weapons are visible at once
- Existing fog + BasicShadowMap + post-processing will mask lower-quality meshes

---

## 10. Similar Games & Projects

| Project | Mechanic | Notes |
|---------|----------|-------|
| **Drawn to Life** (2007, DS) | Draw hero, weapons, platforms on 2D canvas | Original "draw your character" game. Pixel extrapolation for gaps. |
| **Draw Alive** (Breeze Creative) | Children draw on paper → animated 3D character | Interactive installation, computer vision scanning |
| **Car Drawing Game 3D** | Draw car with one line → physics 3D vehicle | Mobile game, line-to-physics-mesh |
| **JSketcher** | Parametric 2D/3D modeler in browser | [github.com/xibyte/jsketcher](https://github.com/xibyte/jsketcher) |
| **VideoCAD** (MIT CSAIL) | AI agent operates CAD from 2D sketches | NeurIPS 2025. Not publicly available. |

---

## 11. Recommendations for DungeonSlopper

### The Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Drawing UI** | Vanilla HTML5 Canvas | Zero deps, fits existing stack |
| **Template system** | Semi-transparent silhouette overlays | Guides sketches, removed on export |
| **AI API** | **fal.ai** (wrapping Tripo/Meshy) | JS SDK, one integration for multiple models |
| **Fallback API** | Stability AI SF3D | 1-second sync response for "instant forge" |
| **3D format** | GLB | Single file with geometry + materials + textures |
| **Loader** | Three.js GLTFLoader | Already available in your Three.js version |

### Recommended Approach: Two Tiers

**Tier 1 — Quick Forge (default):** Stability AI SF3D via direct API
- ~1 second generation
- ~$0.04/model
- Lower quality but instant gratification
- Show a quick hammer-strike animation

**Tier 2 — Master Forge (unlockable):** Tripo v2.5 or Meshy 6 via fal.ai
- 15–60 second generation
- $0.20–0.60/model
- Higher quality with PBR textures
- Show a full forging animation (bellows, sparks, hammering) while waiting

### New Files Needed

```
src/
  drawing/
    SketchPad.ts         — Canvas drawing class (mouse+touch, undo, clear, export)
    WeaponTemplate.ts    — Template overlays per weapon category
    SketchUI.ts          — DOM overlay: canvas, buttons, progress bar
  api/
    modelGenerator.ts    — AI API client (SF3D + fal.ai)
  weapons/
    weaponLoader.ts      — GLTFLoader integration, normalization, disposal
    weaponManager.ts     — Equip/unequip, inventory, blueprint tracking
```

### API Key Consideration

For a game jam / demo: hardcode API key in client (cheap enough to burn through).

For production: set up a thin backend proxy (Cloudflare Worker, Vercel Edge Function) that holds the API key and proxies requests. This prevents key theft and lets you add rate limiting.

### Cost Estimate

At $0.04–0.40/model:
- 100 players × 5 weapons each = 500 generations = **$20–200**
- Game jam budget: very manageable

---

## Key Links

**APIs:**
- [Meshy API Docs](https://docs.meshy.ai/en/api/image-to-3d)
- [Tripo API Platform](https://platform.tripo3d.ai/docs/quick-start)
- [Rodin API Docs](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2)
- [Stability AI SF3D](https://stability.ai/news/introducing-stable-fast-3d)
- [fal.ai 3D Models](https://fal.ai/3d-models)
- [fal.ai JS Client](https://www.npmjs.com/package/@fal-ai/client)

**Open Source:**
- [TRELLIS.2 (Microsoft)](https://github.com/microsoft/TRELLIS.2) — MIT, best quality
- [TripoSR](https://github.com/VAST-AI-Research/TripoSR) — MIT, fastest
- [Hunyuan3D-2.1 (Tencent)](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) — open source
- [Stable Fast 3D](https://github.com/Stability-AI/stable-fast-3d) — self-hostable SF3D

**Sketch-to-3D Guides:**
- [Meshy Sketch-to-3D Blog](https://www.meshy.ai/blog/sketch-to-3d)
- [3D AI Price Comparison](https://www.sloyd.ai/blog/3d-ai-price-comparison)
- [Best 3D AI APIs for Developers](https://www.top3d.ai/learn/best-3d-ai-apis-for-developers)
