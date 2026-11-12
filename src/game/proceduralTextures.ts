import * as THREE from 'three';

/**
 * Procedural Canvas Texture Generator
 * Zero 404 dependencies: All textures generated at runtime with correct sRGB color spaces.
 */

export class TextureFactory {
  private static maxAnisotropy: number = 8;

  public static init(renderer: THREE.WebGLRenderer) {
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  /**
   * Road asphalt texture with center dashed lines and shoulder markings
   */
  public static createRoadTexture(isRunway = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Asphalt base
    ctx.fillStyle = isRunway ? '#22252a' : '#282b30';
    ctx.fillRect(0, 0, 1024, 1024);

    // Asphalt noise grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    if (isRunway) {
      // Runway centerline: thick white dashes
      ctx.fillStyle = '#ffffff';
      for (let y = 0; y < 1024; y += 128) {
        ctx.fillRect(512 - 24, y + 20, 48, 88);
      }
      // Runway edge lines
      ctx.fillRect(60, 0, 20, 1024);
      ctx.fillRect(1024 - 80, 0, 20, 1024);

      // Touchdown zone hash marks
      ctx.fillRect(160, 200, 80, 24);
      ctx.fillRect(1024 - 240, 200, 80, 24);
      ctx.fillRect(160, 600, 80, 24);
      ctx.fillRect(1024 - 240, 600, 80, 24);
    } else {
      // Highway: Yellow double center dashed line
      ctx.fillStyle = '#f5b041';
      for (let y = 0; y < 1024; y += 128) {
        ctx.fillRect(512 - 12, y + 16, 8, 96);
        ctx.fillRect(512 + 4, y + 16, 8, 96);
      }

      // Solid white outer shoulder lane boundaries
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(70, 0, 14, 1024);
      ctx.fillRect(1024 - 84, 0, 14, 1024);

      // Subtle tire wear grooves
      ctx.fillStyle = 'rgba(20, 20, 22, 0.25)';
      ctx.fillRect(250, 0, 110, 1024);
      ctx.fillRect(1024 - 360, 0, 110, 1024);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Skyscraper facade texture with lit/unlit glass windows and structural ribs
   */
  public static createBuildingTexture(colorHue: number, litProbability = 0.5): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Concrete / composite facade base
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 512, 1024);

    const cols = 8;
    const rows = 24;
    const padX = 8;
    const padY = 12;
    const winW = (512 - padX * (cols + 1)) / cols;
    const winH = (1024 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (winW + padX);
        const y = padY + r * (winH + padY);

        const isLit = Math.random() < litProbability;
        if (isLit) {
          // Warm amber, cool cyan, or bright office white
          const windowType = Math.random();
          if (windowType < 0.4) {
            ctx.fillStyle = `hsl(${colorHue}, 85%, 75%)`; // Cyan/blue
          } else if (windowType < 0.75) {
            ctx.fillStyle = '#ffecb3'; // Warm amber
          } else {
            ctx.fillStyle = '#ffffff'; // Crisp white
          }
        } else {
          ctx.fillStyle = '#0d1017'; // Dark unlit glass
        }
        ctx.fillRect(x, y, winW, winH);
      }
    }

    // Architectural spandrels & mullions
    ctx.strokeStyle = '#2a2f3a';
    ctx.lineWidth = 2;
    for (let c = 0; c <= cols; c++) {
      const x = padX * 0.5 + c * (winW + padX);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Terrain ground texture (grass, dirt, subtle gravel noise)
   */
  public static createTerrainTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2d5a36'; // Rich forest/lawn green
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + noise * 0.7)); // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.5)); // B
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Stunt ramp track texture (bold racing orange with caution chevrons)
   */
  public static createStuntTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ff5722'; // High-octane vibrant stunt orange
    ctx.fillRect(0, 0, 512, 512);

    // High-visibility caution chevrons
    ctx.fillStyle = '#111317';
    for (let y = 0; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + 64);
      ctx.lineTo(512, y);
      ctx.lineTo(512, y + 48);
      ctx.lineTo(256, y + 112);
      ctx.lineTo(0, y + 48);
      ctx.closePath();
      ctx.fill();
    }

    // Neon edge rails
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 0, 24, 512);
    ctx.fillRect(512 - 24, 0, 24, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Ocean water normal/specular wave canvas
   */
  public static createOceanTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep coastal turquoise blue
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#006994');
    grad.addColorStop(0.5, '#00838f');
    grad.addColorStop(1, '#004d61');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Wave foam caustic highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 512;
      const x = Math.random() * 400;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 50, y + (Math.random() - 0.5) * 20, x + 100, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
