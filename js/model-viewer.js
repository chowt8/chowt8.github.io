/**
 * model-viewer.js
 *
 * Initializes an interactive 3D model viewer for any element with:
 *   class="model-viewer-container"
 *   data-model="path/to/model.glb"
 *
 * Usage in HTML:
 *   <!-- As a half-width panel (pairs with another .project-asset) -->
 *   <article class="model-viewer-container half project-asset" data-model="../models/plant-stand.glb"></article>
 *
 *   <!-- As a full-width section -->
 *   <section class="model-viewer-container full" data-model="../models/chair.glb"></section>
 *
 * Optional data attributes:
 *   data-auto-rotate="false"   — disable auto-rotation (default: true)
 *   data-background="#1a1a1a"  — override background color (default: #000000)
 *   data-env-intensity="1.5"   — environment light intensity (default: 1.0)
 *
 * Formats: .glb (preferred), .gltf
 * Export pipeline: Blender / Fusion 360 / Rhino → File > Export > .glb
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function initModelViewer(container) {
    const modelPath = container.dataset.model;
    if (!modelPath) return;

    const autoRotate = container.dataset.autoRotate !== 'false';
    const bgColor = container.dataset.background || '#000000';
    const envIntensity = parseFloat(container.dataset.envIntensity) || 1.0;

    // --- Loader UI ---
    const loaderEl = document.createElement('div');
    loaderEl.className = 'model-loader';
    loaderEl.innerHTML = `
        <span>Loading model</span>
        <div class="model-loader-bar-track">
            <div class="model-loader-bar-fill"></div>
        </div>
    `;
    container.appendChild(loaderEl);
    const barFill = loaderEl.querySelector('.model-loader-bar-fill');

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.01,
        1000
    );
    camera.position.set(0, 1, 3);

    // --- Lighting: studio setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, envIntensity * 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, envIntensity * 1.2);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc8d8ff, envIntensity * 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfff0d0, envIntensity * 0.3);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.85;

    // Stop auto-rotate when user interacts, resume after 3s idle
    let resumeTimer = null;
    controls.addEventListener('start', () => {
        controls.autoRotate = false;
        clearTimeout(resumeTimer);
    });
    controls.addEventListener('end', () => {
        if (autoRotate) {
            resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
        }
    });

    // --- Load model ---
    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        (gltf) => {
            const model = gltf.scene;

            // Center and scale model to fit a 2-unit bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;

            model.position.sub(center.multiplyScalar(scale));
            model.scale.setScalar(scale);

            // Enable shadows on all meshes
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            scene.add(model);

            // Position camera to frame the model
            const scaledSize = size.clone().multiplyScalar(scale);
            const fovRad = (camera.fov * Math.PI) / 180;
            const dist = Math.max(scaledSize.x, scaledSize.y) / (2 * Math.tan(fovRad / 2)) * 1.6;
            camera.position.set(0, scaledSize.y * 0.2, dist);
            controls.target.set(0, 0, 0);
            controls.update();

            // Hide loader
            loaderEl.classList.add('hidden');
            setTimeout(() => loaderEl.remove(), 500);
        },
        (progress) => {
            if (progress.total > 0) {
                const pct = (progress.loaded / progress.total) * 100;
                barFill.style.width = pct + '%';
            }
        },
        (error) => {
            console.error('model-viewer: failed to load', modelPath, error);
            loaderEl.querySelector('span').textContent = 'Failed to load model';
        }
    );

    // --- Resize handling ---
    const resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // --- Render loop ---
    let animFrameId;
    function animate() {
        animFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // --- Cleanup when element is removed from DOM ---
    const mutationObserver = new MutationObserver(() => {
        if (!document.contains(container)) {
            cancelAnimationFrame(animFrameId);
            resizeObserver.disconnect();
            renderer.dispose();
            mutationObserver.disconnect();
        }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// Initialize all viewers on the page
document.querySelectorAll('.model-viewer-container[data-model]').forEach(initModelViewer);
