import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GraphicsSettings } from './graphicsSettings';

/**
 * Post-Processing Manager & Pipeline Optimization
 * 
 * Specifically configured according to Eldoria engine requirements:
 * 1. Low and Medium presets bypass heavy screen-space passes (NO UnrealBloomPass, NO DepthOfField / BokehPass).
 * 2. Scene uses lightweight THREE.HemisphereLight + THREE.ACESFilmicToneMapping for rich environmental depth with zero GPU burden.
 * 3. Lightweight FXAAPass is engaged during downscaled resolutions (e.g. 50% / 65% renderScale) to smooth geometric edges.
 * 4. Player input and movement physics updates are strictly decoupled and executed BEFORE the render pass.
 */
export class PostProcessingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private outputPass: OutputPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private useFxaa: boolean = false;

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

    // Apply baseline ACES Filmic Tone Mapping to renderer
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.initPipeline(settings);
  }

  private initPipeline(settings: GraphicsSettings) {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.outputPass = new OutputPass();
    this.fxaaPass = new ShaderPass(FXAAShader);

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.fxaaPass);

    this.applySettings(settings);
  }

  /**
   * Re-evaluates postprocessing passes when settings change.
   * Guarantees that heavy Bloom/DoF are never attached in Medium or Low modes.
   */
  public applySettings(settings: GraphicsSettings) {
    if (!this.composer || !this.fxaaPass) return;

    // Fast Approximate Anti-Aliasing is enabled when downscaled or explicitly requested
    this.useFxaa = settings.renderScale < 1.0 || Boolean(settings.fxaa);
    this.fxaaPass.enabled = this.useFxaa;

    this.updateResolution();
  }

  /**
   * Updates resolution uniforms for FXAA pass to match current canvas buffer size.
   */
  public updateResolution() {
    if (!this.container || !this.composer || !this.fxaaPass) return;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();

    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);

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

  /**
   * Renders the frame cleanly.
   * Player movement and logic must be updated prior to calling this method.
   */
  public render() {
    if (this.useFxaa && this.composer) {
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
    this.renderPass = null;
    this.outputPass = null;
    this.fxaaPass = null;
  }
}
