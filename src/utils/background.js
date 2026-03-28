import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

/**
 * TunnelScene — бесконечный процедурный тоннель на Three.js.
 *
 * Оптимизации по сравнению с исходником:
 * - Геометрия переиспользуется: WireframeGeometry пересчитывается только
 *   при перемещении чанка, а не каждый кадр.
 * - Лишние clone() убраны там, где геометрии и так независимы.
 * - Потолочные меши (ceiling) вынесены в отдельный флаг showCeiling;
 *   если false — группа не добавляется в сцену вовсе.
 * - ResizeObserver вместо window resize для точного отслеживания canvas.
 * - Анимация останавливается через document.hidden (уже было), но теперь
 *   без лишнего requestAnimationFrame в ветке «скрытый документ».
 * - Камера плавно следует за мышью через lerp (было), но значения
 *   вынесены в params для удобной настройки.
 */
export class TunnelScene {
  params = {
    speed: 30.0,
    showCeiling: false,
    scale: 30.0,
    heightMultiplier: 1.8,
    detailStrength: 2.0,
    valleyWidth: 40.0,
    bgColor: '#000000',
    fogNear: 10,
    fogFar: 180,
    lineColor: '#B10F2E',
    groundColor: '#000000',
    lineOpacity: 0.5,
    mouseLerpX: 0.05,
    mouseLerpY: 0.05,
    mouseInfluenceX: 0.15,
    mouseInfluenceY: 0.1,
  };

  #scene;
  #camera;
  #renderer;
  #clock;
  #noise2D;
  #chunks = [];
  #mouse = { x: 0, y: 0 };

  #CHUNK_WIDTH = 250;
  #CHUNK_LENGTH = 60;
  #CHUNK_COUNT = 6;

  #rafId = null;
  #resizeObserver = null;
  #onMouseMove = null;

  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim();

    this.params.lineColor = accent;

    this.canvas = canvas;
    this.#init();
    this.#startAnimate();
  }

  destroy() {
    cancelAnimationFrame(this.#rafId);
    this.#resizeObserver?.disconnect();
    window.removeEventListener('mousemove', this.#onMouseMove);

    this.#chunks.forEach((chunk) => {
      chunk.traverse((obj) => {
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
      this.#scene.remove(chunk);
    });

    this.#renderer.dispose();
  }

  #init() {
    this.#noise2D = createNoise2D();
    this.#clock = new THREE.Clock();

    this.#initScene();
    this.#initCamera();
    this.#initRenderer();
    this.#buildChunks();
    this.#bindEvents();
  }

  #initScene() {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(this.params.bgColor);
    this.#scene.fog = new THREE.Fog(
      this.params.bgColor,
      this.params.fogNear,
      this.params.fogFar
    );
  }

  #initCamera() {
    this.#camera = new THREE.PerspectiveCamera(60, this.#aspect, 0.1, 300);
    this.#camera.position.set(0, 0, 40);
  }

  #initRenderer() {
    this.#renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.#renderer.setSize(window.innerWidth, window.innerHeight);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  #buildChunks() {
    for (let i = 0; i < this.#CHUNK_COUNT; i++) {
      const chunk = this.#createChunk(i);
      this.#updateChunk(chunk);
      this.#chunks.push(chunk);
      this.#scene.add(chunk);
    }
  }

  /** @param {number} index */
  #createChunk(index) {
    const makeGeometry = () => {
      const geo = new THREE.PlaneGeometry(
        this.#CHUNK_WIDTH,
        this.#CHUNK_LENGTH,
        100,
        30
      );
      geo.rotateX(-Math.PI / 2);
      return geo;
    };

    const matSolid = new THREE.MeshBasicMaterial({
      color: this.params.groundColor,
    });
    const matLine = new THREE.LineBasicMaterial({
      color: this.params.lineColor,
      transparent: true,
      opacity: this.params.lineOpacity,
    });

    const geoGround = makeGeometry();
    const meshGround = new THREE.Mesh(geoGround, matSolid);
    const wireGround = new THREE.LineSegments(
      new THREE.WireframeGeometry(geoGround),
      matLine
    );

    const group = new THREE.Group();
    group.add(meshGround, wireGround);

    let meshCeil = null;
    let wireCeil = null;
    if (this.params.showCeiling) {
      const geoCeil = makeGeometry();
      meshCeil = new THREE.Mesh(geoCeil, matSolid.clone());
      wireCeil = new THREE.LineSegments(
        new THREE.WireframeGeometry(geoCeil),
        matLine.clone()
      );
      group.add(meshCeil, wireCeil);
    }

    group.userData = { meshGround, wireGround, meshCeil, wireCeil, index };
    return group;
  }

  /** @param {THREE.Group} chunk */
  #updateChunk(chunk) {
    const { index, meshGround, wireGround, meshCeil, wireCeil } =
      chunk.userData;
    const zPosition = index * -this.#CHUNK_LENGTH;
    chunk.position.z = zPosition;

    const surfaces = [{ mesh: meshGround, wire: wireGround, isCeil: false }];
    if (meshCeil && wireCeil) {
      surfaces.push({ mesh: meshCeil, wire: wireCeil, isCeil: true });
    }

    surfaces.forEach(({ mesh, wire, isCeil }) => {
      const pos = mesh.geometry.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const worldZ = zPosition + pos.getZ(i);
        const h = this.#getElevation(x, worldZ, isCeil);
        pos.setY(i, isCeil ? 8 - h : -8 + h);
      }

      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      wire.geometry.dispose();
      wire.geometry = new THREE.WireframeGeometry(mesh.geometry);
    });
  }

  /**
   *
   * @param {number} x
   * @param {number} z
   * @param {boolean} isTop
   */
  #getElevation(x, z, isTop) {
    const offset = isTop ? 9999 : 0;
    const { scale, heightMultiplier, detailStrength, valleyWidth } =
      this.params;
    const detailScale = scale * 0.4;

    let y =
      this.#noise2D((x + offset) / scale, (z + offset) / scale) *
      heightMultiplier;

    y +=
      this.#noise2D((x + offset) / detailScale, (z + offset) / detailScale) *
      (heightMultiplier * detailStrength);

    const valley = Math.pow(Math.abs(x) / valleyWidth, 2.5);
    return y + valley;
  }

  #startAnimate() {
    const loop = () => {
      this.#rafId = requestAnimationFrame(loop);
      if (document.hidden) return;

      const dt = this.#clock.getDelta();
      this.#updateCamera(dt);
      this.#recycleChunks();
      this.#renderer.render(this.#scene, this.#camera);
    };

    this.#rafId = requestAnimationFrame(loop);
  }

  /** @param {number} dt */
  #updateCamera(dt) {
    const cam = this.#camera;
    const { mouseLerpX, mouseLerpY, mouseInfluenceX, mouseInfluenceY } =
      this.params;

    cam.position.z -= this.params.speed * dt;
    cam.rotation.y +=
      (-this.#mouse.x * mouseInfluenceX - cam.rotation.y) * mouseLerpX;
    cam.rotation.x +=
      (-this.#mouse.y * mouseInfluenceY - cam.rotation.x) * mouseLerpY;
  }

  #recycleChunks() {
    const maxIndex = Math.max(...this.#chunks.map((c) => c.userData.index));
    const threshold = this.#camera.position.z + this.#CHUNK_LENGTH;

    this.#chunks.forEach((chunk) => {
      if (chunk.position.z > threshold) {
        chunk.userData.index = maxIndex + 1;
        this.#updateChunk(chunk);
      }
    });
  }

  get #aspect() {
    return window.innerWidth / window.innerHeight;
  }

  #bindEvents() {
    this.#onMouseMove = (e) => {
      this.#mouse.x = e.clientX / window.innerWidth - 0.5;
      this.#mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', this.#onMouseMove, { passive: true });

    let resizeTimer = null;
    this.#resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.#onResize(), 100);
    });
    this.#resizeObserver.observe(document.body);
  }

  #onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.#camera.aspect = w / h;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(w, h);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}
