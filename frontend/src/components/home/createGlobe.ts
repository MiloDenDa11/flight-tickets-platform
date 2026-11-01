import * as THREE from 'three';

type Options = { paused: () => boolean; signal: AbortSignal; onFailure: () => void };
type Land = { type: string; coordinates?: unknown; geometries?: Land[] };
type LandFile = { type: string; features?: { geometry: Land }[]; geometries?: Land[] };

export function createGlobe(host: HTMLElement, options: Options): () => void {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
  camera.position.set(0, 0, 5.2);
  const globe = new THREE.Group();
  globe.rotation.set(0.18, -1.65, -0.15);
  scene.add(globe);
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const own = <T extends THREE.Material | THREE.BufferGeometry>(value: T): T => { if (value instanceof THREE.Material) materials.add(value); else geometries.add(value); return value; };
  globe.add(new THREE.Mesh(own(new THREE.SphereGeometry(1, 48, 32)), own(new THREE.MeshPhongMaterial({ color: 0x082e50, shininess: 30, specular: 0x277a9c }))));
  scene.add(new THREE.AmbientLight(0x83b9db, 2));
  const light = new THREE.DirectionalLight(0xd3f3ff, 3);
  light.position.set(-3, 4, 5); scene.add(light);
  const rim = new THREE.DirectionalLight(0xd8b46a, 1.2);
  rim.position.set(3, -1, -1); scene.add(rim);
  function point(lon: number, lat: number, radius = 1.006) {
    const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
  }
  const gridMaterial = own(new THREE.LineBasicMaterial({ color: 0x55c4e8, transparent: true, opacity: 0.13 }));
  const lineGroups = new Map<THREE.LineBasicMaterial, number[]>();
  const lineMeshes = new Map<THREE.LineBasicMaterial, THREE.LineSegments>();
  function line(points: THREE.Vector3[], material: THREE.LineBasicMaterial) {
    const vertices = lineGroups.get(material) ?? [];
    for (let i = 1; i < points.length; i++) vertices.push(...points[i - 1].toArray(), ...points[i].toArray());
    lineGroups.set(material, vertices);
  }
  function flushLines() {
    // Batch coastlines and grids by material instead of one draw per polygon.
    lineGroups.forEach((vertices, material) => {
      const geometry = own(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const existing = lineMeshes.get(material);
      if (existing) { geometries.delete(existing.geometry); existing.geometry.dispose(); existing.geometry = geometry; }
      else { const mesh = new THREE.LineSegments(geometry, material); globe.add(mesh); lineMeshes.set(material, mesh); }
    });
  }
  for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 97 }, (_, i) => point(i * 3.75 - 180, lat)), gridMaterial);
  for (let lon = -180; lon < 180; lon += 30) line(Array.from({ length: 49 }, (_, i) => point(lon, i * 3.75 - 90)), gridMaterial);
  const coastMaterial = own(new THREE.LineBasicMaterial({ color: 0x85d5dc, transparent: true, opacity: 0.68 }));
  function ring(coordinates: number[][]) { line(coordinates.map(([lon, lat]) => point(lon, lat, 1.009)), coastMaterial); }
  function land(geometry: Land) {
    if (geometry.type === 'Polygon') (geometry.coordinates as number[][][]).forEach(ring);
    if (geometry.type === 'MultiPolygon') (geometry.coordinates as number[][][][]).forEach(polygon => polygon.forEach(ring));
    geometry.geometries?.forEach(land);
  }
  // Geographic outlines use the existing, local Natural Earth asset.
  // These decorative arcs do not claim to be scheduled services.
  const cities = [[106.7, 10.8], [139.7, 35.7], [103.8, 1.3], [2.35, 48.86], [55.27, 25.2]];
  const routeMaterial = own(new THREE.LineBasicMaterial({ color: 0xd8b46a, transparent: true, opacity: 0.82 }));
  const markerGeometry = own(new THREE.SphereGeometry(0.018, 8, 6));
  const markerMaterial = own(new THREE.MeshBasicMaterial({ color: 0xffd68a }));
  cities.forEach(([lon, lat], i) => {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(point(lon, lat, 1.026)); globe.add(marker);
    if (!i) return;
    const from = point(cities[0][0], cities[0][1], 1.03), to = point(lon, lat, 1.03);
    const middle = from.clone().add(to).normalize().multiplyScalar(1.35 + from.distanceTo(to) * 0.16);
    line(new THREE.QuadraticBezierCurve3(from, middle, to).getPoints(48), routeMaterial);
  });
  flushLines();
  const halo = new THREE.Mesh(own(new THREE.RingGeometry(1.23, 1.233, 100)), own(new THREE.MeshBasicMaterial({ color: 0xd8b46a, transparent: true, opacity: 0.35, side: THREE.DoubleSide })));
  halo.rotation.set(0.75, 0.2, -0.3); scene.add(halo);
  host.append(renderer.domElement);
  let frame = 0, previous = 0, visible = true, stopped = false, released = false;
  const pointer = { x: 0, y: 0 };
  function render(now: number) {
    if (stopped) return;
    frame = requestAnimationFrame(render);
    if (now - previous < 1000 / 24) return;
    const elapsed = Math.min((now - previous) / 1000, 0.05); previous = now;
    if (options.paused()) return;
    globe.rotation.y += elapsed * 0.055;
    globe.rotation.x += (0.18 + pointer.y * 0.08 - globe.rotation.x) * 0.04;
    globe.rotation.z += (-0.15 + pointer.x * 0.06 - globe.rotation.z) * 0.04;
    try { renderer.render(scene, camera); } catch { stop(); stopped = true; options.onFailure(); }
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; }
  function resume() { stop(); if (!stopped && visible && !document.hidden) { previous = performance.now(); frame = requestAnimationFrame(render); } }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || stopped) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    try { renderer.render(scene, camera); } catch { stop(); stopped = true; options.onFailure(); }
  }
  function move(event: PointerEvent) { pointer.x = event.clientX / window.innerWidth - 0.5; pointer.y = event.clientY / window.innerHeight - 0.5; }
  function lost(event: Event) { event.preventDefault(); stop(); stopped = true; options.onFailure(); }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); });
  observer.observe(host);
  const sizes = new ResizeObserver(resize); sizes.observe(host);
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pointermove', move, { passive: true });
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize(); resume();
  const dispose = () => {
    if (released) return;
    released = true;
    stopped = true; stop(); observer.disconnect(); sizes.disconnect();
    document.removeEventListener('visibilitychange', resume); window.removeEventListener('pointermove', move);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
  if (stopped) { dispose(); throw new Error('Scene unavailable'); }
  void fetch('/geo/world-land.geojson', { signal: options.signal })
    .then(response => { if (!response.ok) throw new Error('Geography unavailable'); return response.json() as Promise<LandFile>; })
    .then(data => {
      if (stopped || options.signal.aborted) return;
      data.features?.forEach(feature => land(feature.geometry));
      data.geometries?.forEach(land);
      flushLines(); resize();
    })
    .catch(() => { /* The gridded globe is usable if local outlines cannot load. */ });
  return dispose;
}
