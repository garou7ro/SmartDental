import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * Arcadas dentales procedurales (32 piezas permanentes, numeración FDI).
 * Medidas aproximadas en mm: [mesiodistal, vestíbulo-lingual, altura de corona].
 */
const DIMS = {
  upper: {
    1: [8.6, 7.0, 10.5], 2: [6.6, 6.0, 9.0], 3: [7.6, 8.0, 10.0], 4: [7.0, 9.0, 8.5],
    5: [6.6, 9.0, 7.8], 6: [10.2, 11.0, 7.5], 7: [9.0, 11.0, 7.0], 8: [8.5, 10.0, 6.5],
  },
  lower: {
    1: [5.4, 6.0, 9.0], 2: [5.9, 6.2, 9.5], 3: [6.9, 7.7, 11.0], 4: [7.0, 7.7, 8.5],
    5: [7.0, 8.2, 8.0], 6: [11.0, 10.5, 7.5], 7: [10.5, 10.0, 7.0], 8: [10.0, 9.8, 7.0],
  },
};

// Vistas: inclinación de cada arcada respecto a la cámara.
const VIEWS = { oclusal: 0.95, frontal: 0.16 };

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const spow = (v, p) => Math.sign(v) * Math.abs(v) ** p;
const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const lerp = (a, b, t) => a + (b - a) * t;

function typeOf(pos) {
  if (pos <= 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos <= 5) return 'premolar';
  return 'molar';
}

const C_NECK = new THREE.Color('#d8c3a0');
const C_BODY = new THREE.Color('#f3ece0');
const C_TIP = new THREE.Color('#fbfaf6');
const C_EDGE = new THREE.Color('#e4ebf0'); // borde incisal translúcido
const C_FISSURE = new THREE.Color('#a88d6a');

/*
 * Corona: esfera deformada (superelipse + anatomía oclusal según el tipo de pieza). Ocupa y ∈ [0, h].
 * Lleva color por vértice: cuello más cálido, cúspides claras y surcos oscurecidos, para que la
 * anatomía se lea incluso con luz plana.
 */
function crownGeometry(type, w, d, h, upper, pos) {
  let g = new THREE.SphereGeometry(1, 40, 30);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const col = new THREE.Color();
  let cusps = [];
  if (type === 'molar') {
    cusps = [[-0.46, 0.46, 0.2], [0.46, 0.46, 0.18], [-0.46, -0.46, 0.18], [0.46, -0.46, 0.15]];
    if (!upper && pos === 6) cusps.push([0.05, 0.62, 0.13]); // quinta cúspide del primer molar inferior
  } else if (type === 'premolar') {
    cusps = [[0, 0.46, 0.22], [0, -0.46, upper || pos === 5 ? 0.17 : 0.08]];
  }
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i);
    const uy = p.getY(i);
    const uz = p.getZ(i);
    const posterior = type === 'molar' || type === 'premolar';
    const sx = spow(ux, 0.66);
    const sz = spow(uz, 0.68);
    const sy = uy > 0 ? spow(uy, posterior ? 0.45 : 0.6) : spow(uy, 0.85);
    let X = (sx * w) / 2;
    let Z = (sz * d) / 2;
    let Y = (sy * h) / 2;
    const neck = smooth(0, -1, uy);
    X *= 1 - 0.3 * neck;
    Z *= 1 - 0.24 * neck;
    let groove = 0;
    let edge = 0;
    if (type === 'incisor') {
      const k = smooth(-0.35, 1, uy);
      Z *= 1 - 0.74 * k;
      X *= 1 + 0.07 * k;
      if (uz > 0) Z += d * 0.05 * (1 - uy * uy); // convexidad vestibular
      if (uz < 0) Z += d * 0.04 * smooth(0.1, 0.7, uy); // cíngulo / fosa lingual
      edge = smooth(0.55, 0.95, uy);
    } else if (type === 'canine') {
      const k = smooth(0.05, 1, uy);
      X *= 1 - 0.48 * k;
      Z *= 1 - 0.42 * k;
      Y += h * 0.12 * k * Math.max(0, 1 - Math.abs(ux) * 2.2);
      edge = smooth(0.7, 1, uy) * 0.6;
    } else {
      const top = smooth(0.25, 0.95, uy);
      let bump = 0;
      for (const [cx, cz, a] of cusps) bump += a * Math.exp(-((sx - cx) ** 2 + (sz - cz) ** 2) / 0.075);
      // crestas marginales y surcos
      bump += 0.05 * smooth(0.62, 0.92, Math.abs(sx));
      const central = Math.exp(-((sz / 0.1) ** 2));
      const cross = type === 'molar' ? Math.exp(-((sx / 0.09) ** 2)) : 0;
      bump -= 0.1 * central + 0.07 * cross;
      groove = Math.max(central, cross) * top * smooth(-0.02, 0.12, 0.2 - Math.abs(sx) * 0.1);
      Y += h * top * (bump - 0.06);
    }
    p.setXYZ(i, X, Y + h / 2, Z);
    // color: cuello → cuerpo → cúspide, más surcos y borde incisal
    const hy = smooth(-1, 1, uy);
    col.copy(C_NECK).lerp(C_BODY, smooth(0, 0.55, hy)).lerp(C_TIP, smooth(0.6, 1, hy));
    if (edge > 0) col.lerp(C_EDGE, edge * 0.75);
    if (groove > 0) col.lerp(C_FISSURE, Math.min(1, groove * 0.9));
    colors.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function shellGeometry(src, offset) {
  const g = src.clone();
  g.deleteAttribute('color');
  const p = g.attributes.position;
  const n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + n.getX(i) * offset, p.getY(i) + n.getY(i) * offset, p.getZ(i) + n.getZ(i) * offset);
  }
  return g;
}

// Curva de la arcada (media arcada derecha en mm, incisivos hacia +z).
function archCurve(upper) {
  const s = upper ? 1 : 0.9;
  const half = [[0, 0], [10, -3], [18, -9.5], [23, -19], [26, -31], [28, -44], [29, -56]];
  const pts = [...half.slice(1).reverse().map(([x, z]) => [-x, z]), ...half].map(([x, z]) => new THREE.Vector3(x * s, 0, z * s));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

export default function Odontogram3D({ data, selected, view = 'oclusal', onSelect, reducedMotion = false, onReady, labelsRef }) {
  const mountRef = useRef(null);
  const api = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return undefined;
    }
    const small = window.matchMedia('(max-width: 767px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.8;
    const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
    key.position.set(-60, 80, 60);
    const rim = new THREE.DirectionalLight(0xbcd0ff, 1.1);
    rim.position.set(50, -30, -60);
    scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0xd9c9c6, 0.6));

    const camera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
    const root = new THREE.Group();
    scene.add(root);

    const M = {
      enamel: new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 0.8 }),
      ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf1f5ff, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 }),
      gold: new THREE.MeshPhysicalMaterial({ color: 0xe0b45c, metalness: 1, roughness: 0.2, clearcoat: 0.6, envMapIntensity: 1.4 }),
      titanium: new THREE.MeshPhysicalMaterial({ color: 0xa9b1bb, metalness: 1, roughness: 0.26, envMapIntensity: 1.3 }),
      caries: new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 }),
      resin: new THREE.MeshPhysicalMaterial({ color: 0x7fc8f2, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.2 }),
      ghost: new THREE.MeshPhysicalMaterial({ color: 0x9aa3b5, roughness: 0.4, transparent: true, opacity: 0.18, depthWrite: false }),
      gum: new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color(0xffd6dc), envMapIntensity: 0.7 }),
    };
    const outlineMat = () => new THREE.MeshBasicMaterial({ color: 0x6b5cf6, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false });

    const teeth = new Map();
    const pickables = [];
    const arches = {};
    const geoCache = {};

    const gumMaterialize = (g, top, bottom) => {
      // encía: más clara y rosada junto a los dientes, más profunda hacia la base
      const p = g.attributes.position;
      const colors = new Float32Array(p.count * 3);
      const a = new THREE.Color('#f4a9b6');
      const b = new THREE.Color('#c65466');
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        c.copy(b).lerp(a, smooth(bottom, top, p.getY(i)));
        colors.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    };

    const buildArch = (upper) => {
      const group = new THREE.Group();
      const curve = archCurve(upper);
      const total = curve.getLength();
      const dims = upper ? DIMS.upper : DIMS.lower;
      const half = Object.values(dims).reduce((acc, v) => acc + v[0], 0);
      const gap = 0.25;
      const scale = (half * 2 + gap * 15) / total;
      const mid = total / 2;
      const tangent = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      [-1, 1].forEach((side) => {
        let acc = 0;
        for (let pos = 1; pos <= 8; pos++) {
          const [w, d, h] = dims[pos];
          const center = acc + w / 2;
          acc += w + gap;
          const u = (mid + (side * center) / scale) / total;
          const type = typeOf(pos);
          // Cuadrantes FDI vistos de frente: derecha del paciente a la izquierda de la pantalla.
          const quadrant = upper ? (side < 0 ? 1 : 2) : side < 0 ? 4 : 3;
          const fdi = quadrant * 10 + pos;
          const pt = curve.getPointAt(u).multiplyScalar(scale);
          curve.getTangentAt(u, tangent);
          const outward = new THREE.Vector3().crossVectors(tangent, up).normalize();
          if (outward.dot(new THREE.Vector3(pt.x, 0, pt.z + 30)) < 0) outward.negate();

          const tooth = new THREE.Group();
          tooth.position.copy(pt);
          tooth.rotation.y = Math.atan2(outward.x, outward.z);
          // las piezas homólogas (derecha/izquierda) comparten geometría
          const key = `${upper ? 'u' : 'l'}${pos}`;
          if (!geoCache[key]) {
            const cg = crownGeometry(type, w, d, h, upper, pos);
            cg.computeBoundingBox();
            geoCache[key] = { crown: cg, shell: shellGeometry(cg, 0.45) };
          }
          const crownG = geoCache[key].crown;
          const crown = new THREE.Mesh(crownG, M.enamel);
          const shell = new THREE.Mesh(geoCache[key].shell, outlineMat());
          shell.renderOrder = 2;
          shell.visible = false;
          const implant = new THREE.Group(); // collar de titanio, se crea si hace falta
          implant.visible = false;

          const topY = crownG.boundingBox.max.y;
          const anterior = type === 'incisor' || type === 'canine';
          const lesion = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), M.caries);
          const inlay = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), M.resin);
          if (anterior) {
            lesion.scale.set(w * 0.16, h * 0.12, 0.8);
            lesion.position.set(w * 0.12, h * 0.42, d * 0.42);
            inlay.scale.set(w * 0.3, h * 0.2, 0.9);
            inlay.position.set(0, h * 0.58, d * 0.3);
          } else {
            lesion.scale.set(w * 0.13, 0.9, d * 0.12);
            lesion.position.set(w * 0.12, topY - h * 0.2, d * 0.08);
            inlay.scale.set(w * 0.3, 0.9, d * 0.16);
            inlay.position.set(0, topY - h * 0.2, 0);
          }
          lesion.visible = false;
          inlay.visible = false;

          const inner = new THREE.Group();
          inner.add(crown, implant, shell, lesion, inlay);
          tooth.add(inner);
          group.add(tooth);
          crown.userData.fdi = fdi;
          pickables.push(crown);
          teeth.set(fdi, {
            fdi, upper, pos, type, w, d, h, tooth, inner, crown, implant, shell, lesion, inlay,
            order: pos + (side < 0 ? 0 : 0.5), sel: 0, hover: 0, labelOn: 1,
          });
        }
      });

      // Encía: perfil redondeado extruido a lo largo de la arcada, con extremos redondeados.
      const hw = 5.8;
      const top = 1.4;
      const bottom = -7.5;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, bottom);
      shape.lineTo(hw, bottom);
      shape.quadraticCurveTo(hw + 1.2, top - 3, hw * 0.55, top);
      shape.quadraticCurveTo(0, top + 1.4, -hw * 0.55, top);
      shape.quadraticCurveTo(-hw - 1.2, top - 3, -hw, bottom);
      const gumPath = new THREE.CatmullRomCurve3(curve.points.map((v) => v.clone().multiplyScalar(scale)), false, 'centripetal');
      const frames = gumPath.computeFrenetFrames(80, false);
      const flip = frames.binormals[40].y < 0 ? -1 : 1;
      const pts = shape.getPoints(10).map((v) => new THREE.Vector2(v.x, v.y * flip));
      const gumG = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { steps: 120, bevelEnabled: false, extrudePath: gumPath });
      gumMaterialize(gumG, top, bottom);
      group.add(new THREE.Mesh(gumG, M.gum));
      [0, 1].forEach((end) => {
        // cúpula que cierra el extremo de la encía (sin cortes planos)
        const capG = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        capG.scale(hw, top - bottom, hw);
        capG.translate(0, bottom, 0);
        gumMaterialize(capG, top, bottom);
        const cap = new THREE.Mesh(capG, M.gum);
        const pEnd = gumPath.getPoint(end);
        cap.position.set(pEnd.x, 0, pEnd.z);
        group.add(cap);
      });

      const box = new THREE.Box3().setFromObject(group);
      const c = box.getCenter(new THREE.Vector3());
      group.children.forEach((ch) => ch.position.sub(new THREE.Vector3(c.x, 0, c.z)));
      const pivot = new THREE.Group();
      pivot.add(group);
      if (upper) group.scale.y = -1; // coronas hacia abajo, sin invertir los cuadrantes
      return pivot;
    };

    arches.upper = buildArch(true);
    arches.lower = buildArch(false);
    root.add(arches.upper, arches.lower);

    const state = {
      yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, start: 0, assembled: reducedMotion,
      visible: false, raf: 0, hovered: null, selected: null, drag: null, ready: false,
      viewK: view === 'frontal' ? 1 : 0, viewTarget: view === 'frontal' ? 1 : 0,
      fit: { oclusal: null, frontal: null },
    };

    // Para cada vista: separación entre arcadas, centro y distancia de cámara que llenan el encuadre.
    const fitView = (tilt) => {
      root.rotation.set(0, 0, 0);
      root.position.set(0, 0, 0);
      arches.upper.rotation.x = -tilt;
      arches.lower.rotation.x = tilt;
      arches.upper.position.set(0, 0, 0);
      arches.lower.position.set(0, 0, 0);
      root.updateMatrixWorld(true);
      const hu = new THREE.Box3().setFromObject(arches.upper).getSize(new THREE.Vector3()).y;
      const hl = new THREE.Box3().setFromObject(arches.lower).getSize(new THREE.Vector3()).y;
      const gap = tilt > 0.5 ? 2.5 : 1.2;
      const uy = hu / 2 + gap / 2;
      const ly = -(hl / 2 + gap / 2);
      arches.upper.position.y = uy;
      arches.lower.position.y = ly;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const fovV = THREE.MathUtils.degToRad(camera.fov);
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
      const margin = camera.aspect < 0.9 ? 0.98 : 1.08;
      const dist = Math.max((size.y * 0.5) / Math.tan(fovV / 2), (size.x * 0.5) / Math.tan(fovH / 2)) * margin + size.z * 0.35;
      return { tilt, uy, ly, cy: -center.y, dist };
    };

    const applyView = (k) => {
      const a = state.fit.oclusal;
      const b = state.fit.frontal;
      if (!a || !b) return;
      const e = k * k * (3 - 2 * k);
      const tilt = lerp(a.tilt, b.tilt, e);
      arches.upper.rotation.x = -tilt;
      arches.lower.rotation.x = tilt;
      arches.upper.position.y = lerp(a.uy, b.uy, e);
      arches.lower.position.y = lerp(a.ly, b.ly, e);
      root.position.y = lerp(a.cy, b.cy, e);
      camera.position.set(0, 0, lerp(a.dist, b.dist, e));
      camera.lookAt(0, 0, 0);
    };

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      state.fit.frontal = fitView(VIEWS.frontal);
      state.fit.oclusal = fitView(VIEWS.oclusal);
      applyView(state.viewK);
      requestRender();
    };

    const ensureImplant = (t) => {
      if (t.implant.children.length) return;
      // collar del pilar de titanio, visible sobre la encía
      const collar = new THREE.Mesh(new THREE.TorusGeometry(1, 0.42, 10, 40), M.titanium);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(t.w * 0.5, t.d * 0.5, 1);
      collar.position.y = 1.7;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(t.w, t.d) * 0.3, Math.min(t.w, t.d) * 0.34, 2.2, 24), M.titanium);
      post.position.y = 0.9;
      t.implant.add(collar, post);
    };

    const applyState = (t, s) => {
      if (s === 'implant') ensureImplant(t);
      t.crown.material = s === 'crown' ? M.gold : s === 'implant' ? M.ceramic : s === 'missing' ? M.ghost : M.enamel;
      t.implant.visible = s === 'implant';
      t.lesion.visible = s === 'caries';
      t.inlay.visible = s === 'restoration';
      t.state = s;
    };

    const v3 = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const project = () => {
      const labels = labelsRef?.current;
      if (!labels) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      const reach = w < 420 ? 7.5 : 6.5;
      const e = state.viewK;
      teeth.forEach((t) => {
        const el = labels[t.fdi];
        if (!el) return;
        // oclusal: fuera de la arcada a media corona; frontal: sobre la encía, del lado de la raíz
        v3.set(0, lerp(t.h * 0.55, -5.5, e), lerp(t.d / 2 + reach, t.d * 0.5, e));
        t.tooth.localToWorld(v3);
        // en vista frontal se ocultan las etiquetas de piezas que miran hacia los lados
        let on = 1;
        if (e > 0.01) {
          nrm.set(0, 0, 1).transformDirection(t.tooth.matrixWorld);
          camDir.copy(camera.position).sub(v3).normalize();
          const facing = nrm.dot(camDir);
          on = lerp(1, smooth(0.5, 0.72, facing), e);
          if (state.selected === t.fdi) on = 1;
        }
        v3.project(camera);
        el.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -50%)`;
        if (Math.abs(on - t.labelOn) > 0.01 || on === 0 || on === 1) {
          t.labelOn = on;
          el.style.opacity = on.toFixed(2);
          el.style.pointerEvents = on > 0.5 ? '' : 'none';
          el.tabIndex = on > 0.5 ? 0 : -1;
        }
      });
    };

    const frame = (now) => {
      const t = (now - state.start) / 1000;
      state.yaw += (state.tYaw - state.yaw) * 0.08;
      state.pitch += (state.tPitch - state.pitch) * 0.08;
      let busy = Math.abs(state.tYaw - state.yaw) > 0.0005 || Math.abs(state.tPitch - state.pitch) > 0.0005;
      if (state.viewK !== state.viewTarget) {
        const step = reducedMotion ? 1 : 0.045;
        state.viewK = state.viewTarget > state.viewK ? Math.min(state.viewTarget, state.viewK + step) : Math.max(state.viewTarget, state.viewK - step);
        busy = true;
      }
      applyView(state.viewK);
      root.rotation.y = state.yaw;
      root.rotation.x = state.pitch;
      teeth.forEach((tt) => {
        // entrada escalonada desde la línea media
        let k = 1;
        if (!state.assembled) {
          const local = (t - tt.order * 0.055 - (tt.upper ? 0 : 0.12)) / 0.75;
          k = local <= 0 ? 0.001 : local >= 1 ? 1 : Math.max(0.001, easeOutBack(local));
          if (local < 1) busy = true;
        }
        const wantSel = state.selected === tt.fdi ? 1 : 0;
        const wantHover = state.hovered === tt.fdi ? 1 : 0;
        tt.sel += (wantSel - tt.sel) * (reducedMotion ? 1 : 0.18);
        tt.hover += (wantHover - tt.hover) * (reducedMotion ? 1 : 0.2);
        if (Math.abs(wantSel - tt.sel) > 0.002 || Math.abs(wantHover - tt.hover) > 0.002) busy = true;
        tt.inner.scale.setScalar(k);
        tt.inner.position.y = (tt.sel * 1.6 + tt.hover * 0.6) + (1 - Math.min(1, k)) * 6;
        tt.shell.material.opacity = Math.max(tt.sel * 0.95, tt.hover * 0.45);
        tt.shell.visible = tt.shell.material.opacity > 0.01;
      });
      if (!state.assembled && t > 1.7) state.assembled = true;
      renderer.render(scene, camera);
      project();
      return busy;
    };

    function loop(now) {
      state.raf = 0;
      const busy = frame(now);
      if (busy && state.visible) state.raf = requestAnimationFrame(loop);
    }
    function requestRender() {
      if (!state.raf && state.ready && state.visible) state.raf = requestAnimationFrame(loop);
    }

    // ── interacción ──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return hit ? hit.object.userData.fdi : null;
    };
    const el = renderer.domElement;
    const onMove = (e) => {
      if (state.drag) {
        const dx = e.clientX - state.drag.x;
        const dy = e.clientY - state.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) state.drag.moved = true;
        state.tYaw = THREE.MathUtils.clamp(state.drag.yaw + dx * 0.006, -0.7, 0.7);
        state.tPitch = THREE.MathUtils.clamp(state.drag.pitch + dy * 0.004, -0.3, 0.3);
        requestRender();
        return;
      }
      if (e.pointerType !== 'mouse') return;
      const f = pick(e);
      if (f !== state.hovered) {
        state.hovered = f;
        el.style.cursor = f ? 'pointer' : 'grab';
        requestRender();
      }
    };
    const onDown = (e) => {
      state.drag = { x: e.clientX, y: e.clientY, yaw: state.tYaw, pitch: state.tPitch, moved: false };
    };
    const onUp = (e) => {
      const d = state.drag;
      state.drag = null;
      if (d && !d.moved) {
        const f = pick(e);
        if (f) onSelect?.(f);
      }
    };
    const onCancel = () => { state.drag = null; };
    const onLeave = () => {
      if (state.hovered) { state.hovered = null; requestRender(); }
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onCancel);
    el.style.cursor = 'grab';

    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.visible) {
        if (!state.start) state.start = performance.now();
        requestRender();
      }
    }, { threshold: 0.15 });
    io.observe(mount);

    api.current = {
      setData(map) {
        teeth.forEach((t) => applyState(t, map[t.fdi] || 'healthy'));
        requestRender();
      },
      setSelected(f) {
        state.selected = f;
        requestRender();
      },
      setView(v) {
        state.viewTarget = v === 'frontal' ? 1 : 0;
        state.tYaw = 0;
        state.tPitch = 0;
        requestRender();
      },
    };

    teeth.forEach((t) => applyState(t, data?.[t.fdi] || 'healthy'));
    state.ready = true;
    resize();
    onReady?.();

    return () => {
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onCancel);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose?.();
      });
      Object.values(M).forEach((m) => m.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.remove();
      api.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelect, reducedMotion, onReady, labelsRef]);

  useEffect(() => { api.current.setData?.(data); }, [data]);
  useEffect(() => { api.current.setSelected?.(selected); }, [selected]);
  useEffect(() => { api.current.setView?.(view); }, [view]);

  return <div ref={mountRef} className="sdl-odo3d__canvas" aria-hidden="true" />;
}
