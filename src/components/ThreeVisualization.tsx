import { MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { LiveState } from '../services/liveState';

interface ThreeVisualizationProps {
  live: MutableRefObject<LiveState>;
}

/**
 * The glowing sphere and rings behind the interface. It reads the live values
 * in its own animation loop, so it follows the hands every frame without
 * re-rendering React.
 */
export function ThreeVisualization({ live }: ThreeVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x1a1a1a);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -2;
    scene.add(gridHelper);

    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), sphereMaterial);
    scene.add(sphere);

    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
    scene.add(new THREE.AmbientLight(0x404040, 0.5));

    const ribbons: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
    for (let i = 0; i < 5; i++) {
      const ribbon = new THREE.Mesh(
        new THREE.TorusGeometry(1.5 + i * 0.3, 0.02, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
      );
      ribbon.rotation.x = Math.PI / 2;
      ribbons.push(ribbon);
      scene.add(ribbon);
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const color = new THREE.Color();
    const flash = new THREE.Color();
    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const state = live.current;
      const { frequency, volume, bass } = state;
      // Each drum hit kicks the sphere and tints the rings, then fades out.
      state.drumPulse *= 0.86;
      const pulse = state.drumPulse;

      // Size follows the vocal level and the bass; colour follows the pitch.
      // (Smaller than the first version, whose sphere could fill the screen; it was
      // hidden behind the page background then, so it never showed.)
      sphere.scale.setScalar(0.35 + volume * 0.45 + bass * 0.5 + pulse * 0.25);
      const hue = (frequency - 200) / (1200 - 200);
      color.setHSL(hue * 0.7 + 0.5, 1, 0.5);
      if (pulse > 0.01) color.lerp(flash.set(state.drumColor), pulse * 0.6);
      sphereMaterial.color.copy(color);
      sphereMaterial.emissive.copy(color);
      sphereMaterial.emissiveIntensity = 0.3 + volume * 0.4 + bass * 0.3 + pulse * 0.5;

      ribbons.forEach((ribbon, index) => {
        ribbon.rotation.z += 0.001 * (index + 1) * (1 + pulse * 6);
        ribbon.material.color.copy(color);
        ribbon.material.opacity = 0.1 + volume * 0.3 + bass * 0.2 + pulse * 0.4;
        ribbon.scale.setScalar(0.7 + volume * 0.25 + bass * 0.3 + pulse * 0.12 * (index + 1));
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      gridHelper.dispose();
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [live]);

  // The scene sits behind the panels as ambient light: blurred, so the parts that
  // show between and through the panels read as a glow rather than a stray shape.
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ filter: 'blur(36px) saturate(1.25)', opacity: 0.75 }}
      aria-hidden="true"
    />
  );
}
