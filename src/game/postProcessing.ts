import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GraphicsSettings, isMobileRenderDevice } from './graphicsSettings';

/**
 * Post-Processing Manager & Pipeline Optimization
 *
 * - Bypassed completely in Low / Medium / Mobile without Bloom so GPU fillrate remains minimal.
 * - Enables subtle high-threshold UnrealBloomPass for PC High/Ultra when enableBloomGlow is ON.
 * - FXAAPass engaged for downscaled resolution smoothing or when enabled.
 */
export class PostProcessingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private outputPass: OutputPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private useComposer = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    container: HTMLElement,
    settings: GraphicsSettings
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.container = container;

    this.initPipeline(settings);
  }

  private initPipeline(settings: GraphicsSettings) {
    const w = this.container.clientWidth || window.innerWidth || 1280;
    const h = this.container.clientHeight || window.innerHeight || 720;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(Math.max(1, w / 2), Math.max(1, h / 2)), 0.24, 0.35, 0.88);
    this.outputPass = new OutputPass();
    this.fxaaPass = new ShaderPass(FXAAShader);

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.fxaaPass);

    this.applySettings(settings);
  }

  public applySettings(settings: GraphicsSettings) {
    if (!this.composer || !this.fxaaPass || !this.bloomPass) return;

    const isMobile = isMobileRenderDevice();
    const bloomActive = !isMobile && Boolean(settings.enableBloomGlow) && (settings.preset === 'high' || settings.preset === 'ultra' || settings.preset === 'custom');
    const fxaaActive = settings.renderScale < 1.0 || Boolean(settings.fxaa);

    this.bloomPass.enabled = bloomActive;
    this.fxaaPass.enabled = fxaaActive;
    this.useComposer = bloomActive || (isMobile === false && fxaaActive && settings.preset === 'ultra');

    if (this.useComposer) {
      this.updateResolution();
    }
  }

  public updateResolution() {
    if (!this.container || !this.composer || !this.fxaaPass) return;

    const w = this.container.clientWidth || window.innerWidth || 1280;
    const h = this.container.clientHeight || window.innerHeight || 720;
    const pixelRatio = this.renderer.getPixelRatio();

    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);

    if (this.bloomPass) {
      this.bloomPass.setSize(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
    }

    const bufferW = Math.max(1, Math.floor(w * pixelRatio));
    const bufferH = Math.max(1, Math.floor(h * pixelRatio));

    if (
      this.fxaaPass.material &&
      this.fxaaPass.material.uniforms &&
      this.fxaaPass.material.uniforms['resolution']
    ) {
      this.fxaaPass.material.uniforms['resolution'].value.set(1 / bufferW, 1 / bufferH);
    }
  }

  public render() {
    if (this.useComposer && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public getComposer(): EffectComposer | null {
    return this.composer;
  }

  public getFxaaPass(): ShaderPass | null {
    return this.fxaaPass;
  }

  public dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.bloomPass = null;
    this.renderPass = null;
    this.outputPass = null;
    this.fxaaPass = null;
  }
}
