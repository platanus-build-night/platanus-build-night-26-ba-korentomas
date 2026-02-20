import * as THREE from 'three';

export function createBrickTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base mortar color
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, size, size);

  const brickW = 64;
  const brickH = 28;
  const mortarGap = 4;
  const rows = Math.ceil(size / (brickH + mortarGap));
  const cols = Math.ceil(size / (brickW + mortarGap)) + 1;

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : -(brickW / 2 + mortarGap / 2);
    for (let col = 0; col < cols; col++) {
      const x = col * (brickW + mortarGap) + offset;
      const y = row * (brickH + mortarGap);

      // Vary brick color
      const r = 100 + Math.random() * 40;
      const g = 45 + Math.random() * 20;
      const b = 30 + Math.random() * 15;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, brickW, brickH);

      // Subtle noise on each brick
      for (let i = 0; i < 30; i++) {
        const nx = x + Math.random() * brickW;
        const ny = y + Math.random() * brickH;
        const brightness = Math.random() * 30 - 15;
        ctx.fillStyle = `rgba(${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},${brightness > 0 ? 255 : 0},${Math.abs(brightness) / 100})`;
        ctx.fillRect(nx, ny, 2, 2);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function createStoneFloorTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark stone base
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  const slabSize = 64;
  const gap = 3;
  const slabs = size / slabSize;

  for (let row = 0; row < slabs; row++) {
    for (let col = 0; col < slabs; col++) {
      const x = col * slabSize;
      const y = row * slabSize;
      const g = 35 + Math.random() * 20;
      ctx.fillStyle = `rgb(${g},${g},${g + 2})`;
      ctx.fillRect(x + gap, y + gap, slabSize - gap * 2, slabSize - gap * 2);

      // Stone grain
      for (let i = 0; i < 40; i++) {
        const nx = x + gap + Math.random() * (slabSize - gap * 2);
        const ny = y + gap + Math.random() * (slabSize - gap * 2);
        const b = Math.random() * 20 - 10;
        ctx.fillStyle = `rgba(${b > 0 ? 200 : 0},${b > 0 ? 200 : 0},${b > 0 ? 200 : 0},${Math.abs(b) / 80})`;
        ctx.fillRect(nx, ny, 3, 1);
      }
    }
  }

  // Grout lines
  ctx.strokeStyle = '#0f0f0f';
  ctx.lineWidth = gap;
  for (let i = 0; i <= slabs; i++) {
    ctx.beginPath();
    ctx.moveTo(i * slabSize, 0);
    ctx.lineTo(i * slabSize, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * slabSize);
    ctx.lineTo(size, i * slabSize);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function createCeilingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Very dark rough stone
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = Math.random() * 25;
    ctx.fillStyle = `rgba(${g},${g},${g},0.4)`;
    ctx.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
