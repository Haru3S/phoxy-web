import { MAX_TEXTURE_EDGE, PARALLAX_ASSETS, PARALLAX_CONFIG as config } from './sunsetParallaxConfig';

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  uniform sampler2D uImage;
  uniform sampler2D uDepth;
  uniform vec2 uCover;
  uniform vec2 uOffset;
  uniform vec2 uInset;
  varying vec2 vUv;

  void main() {
    vec2 uv = (vUv - 0.5) * uCover + 0.5;
    // Both textures use normalized image coordinates, regardless of resolution.
    // Bright structures move; the almost-black sky remains anchored.
    float depth = smoothstep(0.0, 0.9, texture2D(uDepth, uv).r);
    vec2 candidate = clamp(uv + uOffset * depth, uInset, 1.0 - uInset);
    float shiftedDepth = smoothstep(0.0, 0.9, texture2D(uDepth, candidate).r);
    // Anchor depth discontinuities so narrow cables and pole edges do not
    // drag unrelated sky pixels across their silhouettes.
    float continuity = 1.0 - smoothstep(0.08, 0.25, abs(depth - shiftedDepth));
    vec2 displaced = clamp(uv + uOffset * depth * continuity, uInset, 1.0 - uInset);
    gl_FragColor = vec4(texture2D(uImage, displaced).rgb, 1.0);
  }
`;

function loadImage(src: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const clear = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      clear();
      image.src = '';
      reject(new DOMException('Image load cancelled', 'AbortError'));
    };
    image.onload = () => { clear(); resolve(image); };
    image.onerror = () => { clear(); reject(new Error('Unable to load sunset texture')); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    else image.src = src;
  });
}

class SunsetParallax extends HTMLElement {
  private canvas?: HTMLCanvasElement;
  private gl?: WebGLRenderingContext;
  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private textures: WebGLTexture[] = [];
  private shaders: WebGLShader[] = [];
  private coverLocation: WebGLUniformLocation | null = null;
  private offsetLocation: WebGLUniformLocation | null = null;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private listeners?: AbortController;
  private loading?: AbortController;
  private preloadObserver?: IntersectionObserver;
  private viewportObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private near = false;
  private visible = false;
  private ready = false;
  private failed = false;
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private width = 0;
  private height = 0;
  private imageAspect = 1;
  private coverX = 1;
  private coverY = 1;
  private pointerX = 0;
  private pointerY = 0;
  private targetX = 0;
  private targetY = 0;

  connectedCallback() {
    if (this.listeners) return;
    this.listeners = new AbortController();
    const { signal } = this.listeners;
    const fallback = this.querySelector('img');
    if (fallback) {
      fallback.addEventListener('error', this.hideBrokenFallback, { signal });
      if (fallback.complete && !fallback.naturalWidth) this.hideBrokenFallback();
    }
    this.motion.addEventListener('change', this.onMotionChange, { signal });
    document.addEventListener('visibilitychange', this.updatePlayback, { signal });
    window.addEventListener('pagehide', this.onPageHide, { signal });
    window.addEventListener('pageshow', this.updatePlayback, { signal });
    window.addEventListener('resize', this.resize, { signal, passive: true });
    this.addEventListener('pointermove', this.onPointerMove, { signal, passive: true });
    this.addEventListener('pointerleave', this.resetPointer, { signal });
    this.addEventListener('pointercancel', this.resetPointer, { signal });

    // Warm textures shortly before arrival; only the zero-margin observer plays.
    this.preloadObserver = new IntersectionObserver(([entry]) => {
      this.near = entry.isIntersecting;
      this.updatePlayback();
    }, { rootMargin: '240px 0px' });
    this.viewportObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.updatePlayback();
    });
    this.resizeObserver = new ResizeObserver(this.resize);
    this.preloadObserver.observe(this);
    this.viewportObserver.observe(this);
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.preloadObserver?.disconnect();
    this.viewportObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.listeners?.abort();
    this.listeners = undefined;
    this.dispose();
    this.near = this.visible = this.failed = false;
    this.resetPointer();
  }

  private hideBrokenFallback = () => {
    const image = this.querySelector('img');
    if (image) image.style.visibility = 'hidden';
  };

  private onPageHide = () => this.stop();

  private onMotionChange = () => {
    if (this.motion.matches) {
      this.dispose();
      this.pointerX = this.pointerY = 0;
      this.resetPointer();
    }
    this.updatePlayback();
  };

  private updatePlayback = () => {
    if (!this.isConnected || this.motion.matches || document.hidden || this.failed) {
      this.stop();
      return;
    }
    if (this.near && !this.canvas && !this.loading) void this.initialize();
    if (this.ready && this.visible && this.width > 0 && this.height > 0) {
      if (!this.frame) this.frame = requestAnimationFrame(this.render);
    } else this.stop();
  };

  private stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0; // freeze phase across visibility pauses
  }

  private compile(type: number, source: string) {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to allocate sunset shader');
    this.shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Sunset shader compilation failed');
    }
    return shader;
  }

  private upload(image: HTMLImageElement, unit: number, color: boolean) {
    const gl = this.gl!;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate sunset texture');
    this.textures.push(texture);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, color ? gl.BROWSER_DEFAULT_WEBGL : gl.NONE);

    const scale = Math.min(1, MAX_TEXTURE_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
      gl.getParameter(gl.MAX_TEXTURE_SIZE) / Math.max(image.naturalWidth, image.naturalHeight));
    let source: TexImageSource = image;
    if (scale < 1) {
      const staging = document.createElement('canvas');
      staging.width = Math.max(1, Math.round(image.naturalWidth * scale));
      staging.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = staging.getContext('2d');
      if (!context) throw new Error('Unable to resize sunset texture');
      context.drawImage(image, 0, 0, staging.width, staging.height);
      source = staging;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('Sunset texture upload failed');
    return [source.width, source.height] as const;
  }

  private async initialize() {
    const loading = new AbortController();
    this.loading = loading;
    try {
      const canvas = document.createElement('canvas');
      this.canvas = canvas;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.addEventListener('webglcontextlost', this.onContextLost);
      canvas.addEventListener('webglcontextrestored', this.onContextRestored);
      this.append(canvas);
      const gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power',
      });
      if (!gl) throw new Error('WebGL is unavailable');
      this.gl = gl;
      const [image, depth] = await Promise.all([
        loadImage(PARALLAX_ASSETS.image, loading.signal),
        loadImage(PARALLAX_ASSETS.depth, loading.signal),
      ]);
      if (loading.signal.aborted) return;
      this.imageAspect = image.naturalWidth / image.naturalHeight;
      const program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate sunset program');
      this.program = program;
      gl.attachShader(program, this.compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Sunset shader linking failed');
      }
      gl.useProgram(program);
      this.buffer = gl.createBuffer() ?? undefined;
      if (!this.buffer) throw new Error('Unable to allocate sunset geometry');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      // One oversized triangle covers the viewport without a diagonal seam.
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const [imageWidth, imageHeight] = this.upload(image, 0, true);
      this.upload(depth, 1, false);
      gl.uniform1i(gl.getUniformLocation(program, 'uImage'), 0);
      gl.uniform1i(gl.getUniformLocation(program, 'uDepth'), 1);
      gl.uniform2f(gl.getUniformLocation(program, 'uInset'), 0.5 / imageWidth, 0.5 / imageHeight);
      this.coverLocation = gl.getUniformLocation(program, 'uCover');
      this.offsetLocation = gl.getUniformLocation(program, 'uOffset');
      this.ready = true;
      this.resize();
    } catch (error) {
      if (!loading.signal.aborted) {
        console.warn('Sunset parallax: using static photograph.', error);
        this.failed = true;
        this.dispose();
      }
    } finally {
      if (this.loading === loading) this.loading = undefined;
    }
    this.updatePlayback();
  }

  private resize = () => {
    if (!this.ready || !this.gl || !this.canvas) return;
    this.width = this.clientWidth;
    this.height = this.clientHeight;
    if (!this.width || !this.height) { this.stop(); return; }
    const gl = this.gl;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, config.maxDevicePixelRatio) * config.resolutionScale;
    const width = Math.max(1, Math.round(this.width * pixelRatio));
    const height = Math.max(1, Math.round(this.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    const aspect = this.width / this.height;
    // A uniform zoom reserves enough source pixels for the maximum displacement
    // in either axis, preserving photograph proportions and hiding exposed edges.
    const zoom = 1 + 2 * config.maxDisplacement / Math.min(this.width, this.height);
    this.coverX = Math.min(1, aspect / this.imageAspect) / zoom;
    this.coverY = Math.min(1, this.imageAspect / aspect) / zoom;
    gl.uniform2f(this.coverLocation, this.coverX, this.coverY);
    this.updatePlayback();
  };

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || this.motion.matches || !this.ready) return;
    const rect = this.getBoundingClientRect();
    this.targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    this.targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
  };

  private resetPointer = () => { this.targetX = this.targetY = 0; };

  private render = (time: number) => {
    this.frame = 0;
    // Also check the live preference here: CSS switches to the photograph
    // immediately, even in browsers that delay the media-query change event.
    if (this.motion.matches) { this.onMotionChange(); return; }
    if (!this.ready || !this.gl || !this.visible || document.hidden) return;
    const delta = this.lastTime ? Math.min(100, time - this.lastTime) : 0;
    this.lastTime = time;
    this.elapsed += delta / 1000;
    const ease = 1 - Math.exp(-delta / config.pointerSmoothing);
    this.pointerX += (this.targetX - this.pointerX) * ease;
    this.pointerY += (this.targetY - this.pointerY) * ease;
    const phase = this.elapsed * config.driftSpeed;
    const amplitude = config.driftAmplitude;
    let x = (amplitude * (0.7 * Math.sin(phase) + 0.3 * Math.sin(phase * 0.73))
      + this.pointerX * amplitude * config.mouseInfluence) * config.depthStrength;
    let y = (amplitude * (0.55 * Math.sin(phase * 0.83) + 0.2 * Math.sin(phase * 1.13))
      + this.pointerY * amplitude * config.mouseInfluence) * config.depthStrength;
    const bound = Math.min(1, config.maxDisplacement / (Math.hypot(x, y) || 1));
    x *= bound;
    y *= bound;
    this.gl.uniform2f(this.offsetLocation, x / this.width * this.coverX, -y / this.height * this.coverY);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    if (!this.hasAttribute('data-rendered')) this.setAttribute('data-rendered', '');
    this.frame = requestAnimationFrame(this.render);
  };

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.stop();
    this.loading?.abort();
    this.loading = undefined;
    this.ready = false;
    this.removeAttribute('data-rendered');
  };

  private onContextRestored = () => {
    this.dispose();
    this.failed = false;
    this.updatePlayback();
  };

  private dispose() {
    this.stop();
    this.loading?.abort();
    this.loading = undefined;
    this.ready = false;
    this.removeAttribute('data-rendered');
    const gl = this.gl;
    if (gl) {
      for (const texture of this.textures) gl.deleteTexture(texture);
      for (const shader of this.shaders) gl.deleteShader(shader);
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.program) gl.deleteProgram(this.program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.textures = [];
    this.shaders = [];
    this.buffer = this.program = undefined;
    this.gl = undefined;
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
      this.canvas.remove();
      this.canvas = undefined;
    }
  }
}

if (!customElements.get('sunset-parallax')) {
  customElements.define('sunset-parallax', SunsetParallax);
}
