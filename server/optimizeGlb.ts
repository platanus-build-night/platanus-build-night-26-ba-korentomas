import { NodeIO } from '@gltf-transform/core';
import { dedup, quantize, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

let simplifierReady: Promise<void> | null = null;

function ensureSimplifier() {
  if (!simplifierReady) {
    simplifierReady = MeshoptSimplifier.ready;
  }
  return simplifierReady;
}

export async function optimizeGlb(inputBuffer: Buffer, targetRatio = 0.5): Promise<Buffer> {
  await ensureSimplifier();

  const io = new NodeIO();
  const doc = await io.readBinary(new Uint8Array(inputBuffer));

  await doc.transform(
    // Remove duplicate meshes/materials/textures
    dedup(),
    // Simplify meshes — keep targetRatio of triangles
    simplify({ simplifier: MeshoptSimplifier, ratio: targetRatio, error: 0.01 }),
    // Quantize vertex attributes (reduce precision, big size savings)
    quantize(),
  );

  const outputUint8 = await io.writeBinary(doc);
  return Buffer.from(outputUint8);
}
