import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Molar 3D en tiempo real sobre el render de estudio del login (blender/access_tooth_layer.py).
// La cámara ortográfica y la pose del molar replican exactamente las de Blender, así que en el
// ángulo 0 el molar coincide con el del render original y el cambio de imagen no se nota.
// Entrada: un giro completo de 360°; después, rotación lenta continua y arrastre con inercia.

const MODEL_URL = '/landing/3d/molar.glb';
const IMAGE = { w: 1200, h: 1500 };
const ORTHO_SCALE = 8.3; // se aplica a la dimensión mayor (alto)
// Matriz de mundo de la cámara de Blender, con el mundo pasado a Y arriba (los ejes locales de
// cámara ya coinciden con los de three.js: mira hacia -Z con Y arriba).
const CAMERA = [
  0.8741572499, -0.2069599032, 0.4393366575, 5,
  0, 0.9046494961, 0.4261563718, 6,
  -0.4856429696, -0.3725276291, 0.7908059359, 9,
  0, 0, 0, 1,
];
const TOOTH = [
  0.8719965815544128, -0.1856478601694107, -0.357897013425827, 0,
  0.24864596128463745, 0.9189285635948181, 0.1291469782590866, 2.4000000953674316,
  0.31738078594207764, -0.20985382795333862, 0.8821361660957336, 0,
  0, 0, 0, 1,
];
const PIVOT = new THREE.Vector3(-0.0805, 2.6826, -0.0709);

const INTRO_MS = 2200;
const IDLE_SPEED = (Math.PI * 2) / 16000; // una vuelta cada 16 s
const easeOutBack = (t) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export default function LoginTooth3D({ paused = false, onReady }) {
  const mountRef = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return undefined; // sin WebGL se queda el render estático
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;

    // Luces de estudio equivalentes a las de Blender (Z arriba → Y arriba).
    const lights = [
      [[-4, 7, 4], '#fff0e3', 2.1],
      [[4, 5, -1], '#ab97ff', 1.3],
      [[-3, 3, -2], '#80f0ff', 1.1],
    ];
    lights.forEach(([pos, color, intensity]) => {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...pos);
      light.target.position.copy(PIVOT);
      scene.add(light, light.target);
    });
    scene.add(new THREE.HemisphereLight('#f4f2ff', '#cfd2dc', 0.6));

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.matrixAutoUpdate = false;
    camera.matrix.fromArray(CAMERA).transpose();
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
    camera.matrixWorld.copy(camera.matrix);
    camera.matrixWorldInverse.copy(camera.matrix).invert();

    // pivot (gira en Y del mundo) → offset → molar con la pose del render
    const spin = new THREE.Group();
    spin.position.copy(PIVOT);
    const offset = new THREE.Group();
    offset.position.copy(PIVOT).negate();
    spin.add(offset);
    scene.add(spin);

    const porcelain = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setRGB(0.78, 0.83, 0.88, THREE.LinearSRGBColorSpace),
      metalness: 0.12,
      roughness: 0.2,
      clearcoat: 0.32,
      clearcoatRoughness: 0.15,
      sheen: 0.3,
      sheenColor: new THREE.Color('#e8f4ff'),
    });

    // Encaja la cámara como object-fit: cover sobre el panel.
    let width = 1;
    let height = 1;
    const fit = () => {
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      const scale = Math.max(width / IMAGE.w, height / IMAGE.h);
      const unitsPerPx = ORTHO_SCALE / IMAGE.h;
      const halfW = (width / scale) * unitsPerPx / 2;
      const halfH = (height / scale) * unitsPerPx / 2;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(() => { fit(); render(); });
    ro.observe(mount);

    // Arrastre con inercia
    let angle = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    const el = renderer.domElement;
    const onDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    };
    const onMove = (e) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const delta = (dx / Math.max(200, width)) * Math.PI * 2;
      angle += delta;
      velocity = delta / Math.max(1, now - lastT);
      lastX = e.clientX;
      lastT = now;
      wake();
    };
    const onUp = () => {
      dragging = false;
      el.classList.remove('is-dragging');
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    let raf = 0;
    let start = 0;
    let last = 0;
    let visible = true;
    let disposed = false;

    const render = () => renderer.render(scene, camera);

    const frame = (now) => {
      raf = 0;
      if (disposed) return;
      const dt = Math.min(48, now - (last || now));
      last = now;
      const t = (now - start) / INTRO_MS;
      if (!dragging) {
        if (Math.abs(velocity) > 0.00002) {
          angle += velocity * dt;
          velocity *= Math.pow(0.94, dt / 16.7);
        } else if (!pausedRef.current && !reduced) {
          angle += IDLE_SPEED * dt;
        }
      }
      // Giro de entrada de 360° encima del ángulo base
      const intro = !reduced && t < 1 ? (easeOutBack(Math.min(1, Math.max(0, t))) - 1) * Math.PI * 2 : 0;
      spin.rotation.y = angle + intro;
      spin.position.y = PIVOT.y + (reduced ? 0 : Math.sin(now / 1400) * 0.035);
      render();
      const moving = dragging || Math.abs(velocity) > 0.00002 || (!pausedRef.current && !reduced) || t < 1;
      if (visible && moving) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible && !disposed) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    io.observe(mount);
    const onVisibility = () => { if (!document.hidden) wake(); };
    document.addEventListener('visibilitychange', onVisibility);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(MODEL_URL, (gltf) => {
      if (disposed) return;
      const molar = gltf.scene.getObjectByName('Molar');
      if (!molar) return;
      molar.removeFromParent();
      molar.material = porcelain;
      molar.matrixAutoUpdate = false;
      molar.matrix.fromArray(TOOTH).transpose();
      offset.add(molar);
      render();
      start = performance.now();
      onReadyRef.current?.();
      wake();
    });

    mount.__wake = wake;
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      scene.traverse((o) => o.geometry?.dispose());
      porcelain.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.remove();
    };
  }, []);

  // Reanudar al quitar la pausa
  useEffect(() => {
    if (!paused) mountRef.current?.__wake?.();
  }, [paused]);

  return <div ref={mountRef} className="sd-auth__tooth3d" />;
}
