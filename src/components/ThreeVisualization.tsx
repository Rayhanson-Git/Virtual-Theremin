import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeVisualizationProps {
  frequency: number;
  volume: number;
  rotation: number;
}

export function ThreeVisualization({ frequency, volume, rotation }: ThreeVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    sphere: THREE.Mesh;
    ribbons: THREE.Mesh[];
    gridHelper: THREE.GridHelper;
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x1a1a1a);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -2;
    scene.add(gridHelper);

    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const ribbons: THREE.Mesh[] = [];
    const ribbonCount = 5;
    for (let i = 0; i < ribbonCount; i++) {
      const ribbonGeometry = new THREE.TorusGeometry(1.5 + i * 0.3, 0.02, 16, 100);
      const ribbonMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3
      });
      const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
      ribbon.rotation.x = Math.PI / 2;
      ribbons.push(ribbon);
      scene.add(ribbon);
    }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      sphere,
      ribbons,
      gridHelper,
      animationId: null
    };

    const handleResize = () => {
      if (!sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);

      const { renderer, scene, camera, ribbons } = sceneRef.current;

      ribbons.forEach((ribbon, index) => {
        ribbon.rotation.z += 0.001 * (index + 1);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (sceneRef.current?.renderer) {
        containerRef.current?.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current.renderer.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    const { sphere, ribbons } = sceneRef.current;

    const baseScale = 0.5 + volume * 1.0;
    const rotationScale = rotation * 1.2;
    const scale = baseScale + rotationScale;
    sphere.scale.setScalar(scale);

    const hue = (frequency - 200) / (1200 - 200);
    const color = new THREE.Color().setHSL(hue * 0.7 + 0.5, 1, 0.5);

    (sphere.material as THREE.MeshStandardMaterial).color = color;
    (sphere.material as THREE.MeshStandardMaterial).emissive = color;
    (sphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + volume * 0.4 + rotation * 0.3;

    ribbons.forEach((ribbon) => {
      (ribbon.material as THREE.MeshBasicMaterial).color = color;
      (ribbon.material as THREE.MeshBasicMaterial).opacity = 0.1 + volume * 0.3 + rotation * 0.2;
      ribbon.scale.setScalar(0.8 + volume * 0.3 + rotation * 0.4);
    });
  }, [frequency, volume, rotation]);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
}
