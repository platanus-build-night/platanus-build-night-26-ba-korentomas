export function createFaviconPreview(container: HTMLElement) {
  // Create preview sizes
  const sizes = [16, 32, 64, 192];
  const previewGrid = document.createElement('div');
  previewGrid.className = 'preview-grid';

  const images: HTMLImageElement[] = [];

  for (const size of sizes) {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';

    const img = document.createElement('img');
    img.width = size;
    img.height = size;
    img.className = 'preview-img';
    img.style.imageRendering = 'pixelated';

    const label = document.createElement('span');
    label.className = 'preview-label';
    label.textContent = `${size}\u00d7${size}`;

    wrapper.appendChild(img);
    wrapper.appendChild(label);
    previewGrid.appendChild(wrapper);
    images.push(img);
  }

  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-btn';
  downloadBtn.textContent = 'Download Favicon';
  downloadBtn.className = 'download-btn';
  downloadBtn.disabled = true;

  container.appendChild(previewGrid);
  container.appendChild(downloadBtn);

  let currentBlob: Blob | null = null;
  let currentName = 'favicon';

  downloadBtn.addEventListener('click', () => {
    if (!currentBlob) return;
    const url = URL.createObjectURL(currentBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentName}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function loadImage(buffer: ArrayBuffer, name: string) {
    const blob = new Blob([buffer], { type: 'image/png' });
    currentBlob = blob;
    currentName = name || 'favicon';
    const url = URL.createObjectURL(blob);

    for (const img of images) {
      img.src = url;
    }

    downloadBtn.disabled = false;
  }

  return { loadImage };
}
