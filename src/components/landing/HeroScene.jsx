import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Hero de vidrio holográfico a sangre completa.
// - Fondo: aurora pastel animada (GLSL) que el vidrio refracta.
// - Molar propio (blender/export_glb.py) en vidrio con transmisión, dispersión e iridiscencia,
//   ensamblado al cargar a partir de partículas muestreadas de su superficie.
// - Prismas, esferas y losas de vidrio flotando en distintas profundidades (parallax con el cursor).
// - Arrastre para girar el molar con inercia; al hacer scroll todo se aleja.

const MODEL_URL = '/landing/3d/molar.glb';
const ASSEMBLE = 2.2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const auroraVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const auroraFragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  varying vec2 vUv;
  float blob(vec2 uv, vec2 c, float r) { float d = length(uv - c); return smoothstep(r, 0.0, d); }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.06;
    vec3 base = vec3(0.957, 0.949, 0.973);
    vec3 lav = vec3(0.80, 0.74, 1.0);
    vec3 cyan = vec3(0.70, 0.93, 0.96);
    vec3 pink = vec3(1.0, 0.80, 0.90);
    vec3 blue = vec3(0.74, 0.83, 1.0);
    vec3 col = base;
    col = mix(col, lav, blob(uv, vec2(0.72 + 0.06 * sin(t * 3.1), 0.62 + 0.05 * cos(t * 2.3)) + uPointer * 0.02, 0.55) * 0.85);
    col = mix(col, cyan, blob(uv, vec2(0.92 + 0.05 * cos(t * 2.7), 0.30 + 0.06 * sin(t * 1.9)), 0.42) * 0.8);
    col = mix(col, pink, blob(uv, vec2(0.48 + 0.07 * sin(t * 1.7), 0.86 + 0.04 * cos(t * 2.9)), 0.38) * 0.7);
    col = mix(col, blue, blob(uv, vec2(0.18 + 0.05 * cos(t * 2.1), 0.70 + 0.05 * sin(t * 2.5)), 0.35) * 0.45);
    // velo claro abajo a la izquierda para la legibilidad del titular
    col = mix(col, base, smoothstep(0.75, 0.0, length((uv - vec2(0.0, 0.0)) * vec2(1.2, 1.6))) * 0.85);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const particleVertex = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  attribute vec3 aStart;
  attribute float aSeed;
  varying float vSeed;
  varying float vSettle;
  float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }
  void main() {
    float delay = aSeed * 0.45;
    float t = clamp((uProgress - delay) / (1.0 - delay * 0.6), 0.0, 1.0);
    float e = easeOutCubic(t);
    vec3 start = aStart;
    float swirl = (1.0 - e) * 3.2 * (aSeed - 0.5);
    float c = cos(swirl), s = sin(swirl);
    start.xz = mat2(c, -s, s, c) * start.xz;
    vec3 pos = mix(start, position, e);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 d = clip.xy / clip.w - uPointer;
    float infl = exp(-dot(d, d) * 18.0) * uPointerStrength * e;
    mv.xy += normalize(d + 0.0001) * infl * 0.35;
    gl_Position = projectionMatrix * mv;
    vSeed = aSeed;
    vSettle = e;
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 0.9) / -mv.z;
  }
`;
const particleFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vSeed;
  varying float vSettle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.15, d);
    vec3 lav = vec3(0.47, 0.38, 0.92);
    vec3 cyan = vec3(0.10, 0.62, 0.72);
    vec3 pink = vec3(0.86, 0.38, 0.66);
    vec3 col = vSeed < 0.33 ? lav : (vSeed < 0.66 ? cyan : pink);
    gl_FragColor = vec4(col, a * uOpacity * 0.55);
  }
`;

function glass(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 1.2,
    ior: 1.5,
    dispersion: 0,
    iridescence: 1,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 720],
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.25,
    specularIntensity: 1,
    ...opts,
  });
}

function makeAssembly(mesh, count) {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const target = new Float32Array(count * 3);
  const start = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const p = new THREE.Vector3();
  const box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
  const size = box.getSize(new THREE.Vector3()).length();
  for (let i = 0; i < count; i += 1) {
    sampler.sample(p);
    target.set([p.x, p.y, p.z], i * 3);
    const r = size * (1.3 + Math.random() * 1.4);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    start.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(target, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 38 },
      uPixelRatio: { value: 1 },
      uPointer: { value: new THREE.Vector2(9, 9) },
      uPointerStrength: { value: 0 },
      uOpacity: { value: 1 },
    },
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

export default function HeroScene({ onReady, reducedMotion = false, hold = false }) {
  const mountRef = useRef(null);
  // Mientras la intro de marca cubre la página, el ensamblaje espera en t = 0.
  const holdRef = useRef(hold);
  holdRef.current = hold;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return undefined; // sin WebGL: se queda el póster
    }
    const small = window.matchMedia('(max-width: 959px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25);
    renderer.setPixelRatio(dpr);
    // la pasada de transmisión (vidrio) se calcula a media resolución: se nota poco y cuesta 4 veces menos
    renderer.transmissionResolutionScale = 0.5;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f4f2f8');
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.03);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 1.25;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.2, 12);

    // Fondo de aurora (lo refracta el vidrio)
    const aurora = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: auroraVertex,
        fragmentShader: auroraFragment,
        uniforms: { uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() } },
        depthWrite: false,
      })
    );
    aurora.position.z = -8;
    scene.add(aurora);

    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(-4, 6, 6);
    const rimA = new THREE.PointLight('#b9a6ff', 40, 20, 1.6);
    rimA.position.set(4, 2, -2);
    const rimB = new THREE.PointLight('#7fe6f0', 35, 20, 1.6);
    rimB.position.set(-4, -2, -1);
    scene.add(key, rimA, rimB, new THREE.HemisphereLight('#ffffff', '#d9d2ef', 0.7));

    // vidrio nacarado: transmisión parcial y tinte lavanda para que destaque sobre el fondo claro
    const molarMat = glass({
      color: '#f6f2ff',
      transmission: 0.72,
      roughness: 0.1,
      thickness: 3,
      attenuationColor: new THREE.Color('#bfaaff'),
      attenuationDistance: 1.4,
      sheen: 1,
      sheenColor: new THREE.Color('#d9ccff'),
      sheenRoughness: 0.35,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0,
    });
    const ringMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 0.55, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 0.6, iridescenceIOR: 1.5, transparent: true, opacity: 0,
    });

    const world = new THREE.Group(); // molar y anillos (centro-derecha)
    scene.add(world);
    const floaters = new THREE.Group(); // objetos de vidrio flotantes
    scene.add(floaters);

    // Objetos de vidrio flotantes: [geometría, material, posición, escala, profundidad para parallax]
    const floaterDefs = [
      [new THREE.ConeGeometry(0.9, 1.6, 4, 1), glass({ thickness: 1.4 }), [4.6, 2.2, -2.5], 1, 0.6],
      [new THREE.SphereGeometry(0.55, 64, 32), glass({ thickness: 1 }), [-1.4, 2.6, -3.5], 1, 0.45],
      [new RoundedBoxGeometry(1.4, 1.4, 1.4, 6, 0.16), glass({ thickness: 1.6, iridescenceThicknessRange: [300, 900] }), [5.4, -2.2, -1.5], 1, 0.8],
      [new RoundedBoxGeometry(0.22, 2.6, 1.8, 4, 0.08), glass({ thickness: 0.6 }), [0.2, -0.4, -4.5], 1, 0.3],
      [new THREE.SphereGeometry(0.28, 48, 24), glass({ thickness: 0.6 }), [2.0, -2.8, 0.5], 1, 1.2],
      [new THREE.SphereGeometry(0.18, 32, 16), new THREE.MeshPhysicalMaterial({ color: '#efeaff', metalness: 1, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6 }), [6.6, 0.6, -0.5], 1, 1.1],
      [new THREE.TorusGeometry(0.7, 0.12, 32, 96), glass({ thickness: 0.5 }), [-3.2, -2.6, -2.5], 1, 0.55],
    ];
    const floats = floaterDefs
      .filter((_, i) => !small || i % 2 === 0)
      .map(([geo, mat, pos, sc, depth], i) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(...pos);
        m.scale.setScalar(sc);
        m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
        floaters.add(m);
        return { mesh: m, base: new THREE.Vector3(...pos), depth, phase: i * 1.7, spin: 0.15 + (i % 3) * 0.08 };
      });

    const state = {
      molarPivot: null,
      molarCenter: new THREE.Vector3(),
      rings: [],
      assembly: null,
      pointer: { x: 0, y: 0, tx: 0, ty: 0, ndc: new THREE.Vector2(9, 9), strength: 0, active: false },
      drag: { on: false, lastX: 0, vel: 0, angle: 0 },
      visible: true,
      pageVisible: !document.hidden,
      start: performance.now(),
      raf: 0,
      ready: false,
      solid: false,
      perf: { frames: 0, sum: 0, last: 0, level: 0, done: false },
      worldX: 2.4,
      worldY: 0.6,
    };

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      MODEL_URL,
      (gltf) => {
        const root = gltf.scene;
        root.updateMatrixWorld(true);
        let molar = null;
        root.traverse((o) => {
          if (!o.isMesh) return;
          if (o.name.startsWith('Molar')) {
            o.material = molarMat;
            molar = o;
          } else {
            o.material = ringMat;
            const ex = o.userData || {};
            if (ex.axis && ex.center) {
              state.rings.push({
                mesh: o, base: o.matrix.clone(),
                axis: new THREE.Vector3(...ex.axis).normalize(), center: new THREE.Vector3(...ex.center),
                speed: o.name.startsWith('RingA') ? 0.32 : -0.2,
              });
              o.matrixAutoUpdate = false;
            }
          }
        });
        if (molar) {
          const box = new THREE.Box3().setFromObject(molar);
          box.getCenter(state.molarCenter);
          const pivot = new THREE.Group();
          pivot.position.copy(state.molarCenter);
          molar.position.sub(state.molarCenter);
          pivot.add(molar);
          const assembly = makeAssembly(molar, small ? 2500 : 5000);
          assembly.position.copy(molar.position);
          assembly.quaternion.copy(molar.quaternion);
          assembly.scale.copy(molar.scale);
          assembly.material.uniforms.uPixelRatio.value = dpr;
          pivot.add(assembly);
          state.assembly = assembly;
          state.molarPivot = pivot;
          world.add(pivot);
        }
        state.rings.forEach((r) => world.add(r.mesh));
        resize();
        // compila los shaders en paralelo (sin bloquear el hilo principal) antes del primer fotograma
        const compile = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve();
        compile.catch(() => {}).then(() => {
          if (disposed) return;
          state.start = performance.now();
          renderFrame(reducedMotion ? state.start + ASSEMBLE * 1000 + 2000 : state.start);
          state.ready = true;
          onReady?.();
          if (!reducedMotion) loop();
        });
      },
      undefined,
      () => {}
    );

    const q = new THREE.Quaternion();
    const m4 = new THREE.Matrix4();
    const t1 = new THREE.Matrix4();
    const t2 = new THREE.Matrix4();
    const rot = new THREE.Matrix4();

    function scrollProgress() {
      const section = mount.closest('section');
      if (!section) return 0;
      const r = section.getBoundingClientRect();
      return clamp01(-r.top / Math.max(1, r.height * 0.9));
    }

    function renderFrame(now) {
      if (holdRef.current && !state.frozen) state.start = now;
      const t = (now - state.start) / 1000;
      const assemble = clamp01(t / ASSEMBLE);
      const solid = clamp01((t - ASSEMBLE * 0.82) / 0.8);
      const intro = easeOut(clamp01(t / 1.8));
      const p = scrollProgress();
      const pt = state.pointer;
      pt.x += (pt.tx - pt.x) * 0.05;
      pt.y += (pt.ty - pt.y) * 0.05;
      pt.strength += ((pt.active ? 1 : 0) - pt.strength) * 0.08;
      const dg = state.drag;
      if (!dg.on) dg.vel *= 0.94;
      dg.angle += dg.vel;

      aurora.material.uniforms.uTime.value = reducedMotion ? 0 : t;
      aurora.material.uniforms.uPointer.value.set(pt.x, -pt.y);

      world.position.set(state.worldX, state.worldY + p * 1.6, 0);
      world.rotation.x = pt.y * 0.18 + p * 0.3;
      world.rotation.y = pt.x * 0.3;
      world.scale.setScalar((0.92 + 0.08 * intro) * (1 - p * 0.18));

      if (state.molarPivot) {
        const pv = state.molarPivot;
        pv.rotation.y = -1.2 * (1 - easeOut(assemble)) + Math.sin(t * 0.35) * 0.25 + p * 1.6 + dg.angle;
        pv.position.y = state.molarCenter.y + (reducedMotion ? 0 : Math.sin(t * 0.9) * 0.08);
      }
      molarMat.opacity = solid;
      ringMat.opacity = easeOut(clamp01((t - 0.5) / 1.4));
      // (no se cambia transparent al terminar: recompilar el shader provocaba un tirón visible)
      if (state.assembly) {
        const u = state.assembly.material.uniforms;
        u.uProgress.value = assemble;
        u.uTime.value = t;
        u.uPointer.value.copy(pt.ndc);
        u.uPointerStrength.value = pt.strength;
        u.uOpacity.value = (1 - solid) * (1 - p);
        state.assembly.visible = solid < 1;
      }
      for (const r of state.rings) {
        const ang = (reducedMotion ? 0 : t * r.speed) + (1 - intro) * r.speed * 6;
        q.setFromAxisAngle(r.axis, ang);
        t1.makeTranslation(r.center.x, r.center.y, r.center.z);
        t2.makeTranslation(-r.center.x, -r.center.y, -r.center.z);
        m4.copy(t1).multiply(rot.makeRotationFromQuaternion(q)).multiply(t2).multiply(r.base);
        r.mesh.matrix.copy(m4);
      }
      for (const f of floats) {
        const drift = reducedMotion ? 0 : Math.sin(t * 0.6 + f.phase) * 0.18;
        f.mesh.position.set(
          f.base.x - pt.x * f.depth * 0.5,
          f.base.y + drift + pt.y * f.depth * 0.35 + p * (1 + f.depth) * 1.4,
          f.base.z
        );
        if (!reducedMotion) {
          f.mesh.rotation.x += 0.0025 * f.spin * 4;
          f.mesh.rotation.y += 0.004 * f.spin * 4;
        }
        f.mesh.scale.setScalar(intro);
      }
      renderer.render(scene, camera);
    }

    // Calidad adaptativa: si el equipo no mantiene ~40 fps, baja resolución y dispersión;
    // si aun así va lento, deja la escena quieta en su último fotograma.
    function adapt(now) {
      const pf = state.perf;
      if (pf.done || document.hidden) return true;
      if (pf.last) {
        pf.sum += now - pf.last;
        pf.frames += 1;
      }
      pf.last = now;
      if (pf.frames < 45) return true;
      const avg = pf.sum / pf.frames;
      pf.frames = 0;
      pf.sum = 0;
      if (avg < 20) {
        pf.done = true;
        return true;
      }
      pf.level += 1;
      if (pf.level === 1) {
        renderer.setPixelRatio(Math.min(1, dpr));
        renderer.transmissionResolutionScale = 0.35;
        resize();
        return true;
      }
      pf.done = true;
      return avg < 45; // más de ~45 ms por fotograma: escena estática
    }

    function loop() {
      cancelAnimationFrame(state.raf);
      const tick = (now) => {
        if (!state.visible || !state.pageVisible) {
          state.raf = 0;
          state.perf.last = 0;
          return;
        }
        // tapado por la intro de marca: no se dibuja nada
        if (holdRef.current) {
          state.start = now;
          state.perf.last = 0;
          state.raf = requestAnimationFrame(tick);
          return;
        }
        renderFrame(now);
        if (!adapt(now)) {
          // equipo lento: se congela, pero con el molar ya formado (fotograma final de la intro)
          state.start = now - (ASSEMBLE + 2.5) * 1000;
          renderFrame(now);
          state.raf = 0;
          state.frozen = true;
          return;
        }
        state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
    }

    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const narrow = w / h < 0.9;
      camera.position.z = narrow ? 16 : 12;
      state.worldX = narrow ? 0 : Math.min(3.2, 1.2 + (w / h - 1) * 2.2);
      if (narrow) state.worldX = 0;
      state.worldY = narrow ? 2.2 : 0.7;
      camera.updateProjectionMatrix();
      // el plano de aurora cubre siempre todo el encuadre
      const dist = camera.position.z - aurora.position.z;
      const hh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      aurora.scale.set(hh * camera.aspect * 1.15, hh * 1.15, 1);
      if (state.ready && (reducedMotion || !state.raf)) renderFrame(performance.now());
    }

    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.visible && state.ready && !reducedMotion && !state.raf && !state.frozen) loop();
    });
    io.observe(mount);
    const onVisibility = () => {
      state.pageVisible = !document.hidden;
      if (state.pageVisible && state.ready && !reducedMotion && !state.raf && !state.frozen) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const onPointer = (e) => {
      state.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      state.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      const r = mount.getBoundingClientRect();
      state.pointer.active = e.clientY >= r.top && e.clientY <= r.bottom;
      state.pointer.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      if (state.drag.on) {
        const dx = e.clientX - state.drag.lastX;
        state.drag.lastX = e.clientX;
        state.drag.vel = dx * 0.006;
      }
    };
    const onDown = (e) => {
      if (e.target.closest('a, button')) return;
      state.drag.on = true;
      state.drag.lastX = e.clientX;
      state.drag.vel = 0;
    };
    const onUp = () => { state.drag.on = false; };
    const section = mount.closest('section') || mount;
    if (!reducedMotion) {
      if (fine) window.addEventListener('pointermove', onPointer, { passive: true });
      else section.addEventListener('pointermove', onPointer, { passive: true });
      section.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      section.removeEventListener('pointermove', onPointer);
      section.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose?.();
      });
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady, reducedMotion]);

  return <div ref={mountRef} className="sdl-hero3d__canvas" />;
}
