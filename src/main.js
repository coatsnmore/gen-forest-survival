import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { SceneManager } from './managers/SceneManager';
import { Controls } from './systems/Controls';
import { Tree } from './components/Tree';
import { DayNightCycle } from './systems/DayNightCycle';
import { GameManager } from './managers/GameManager';
import { Player } from './components/Player';

let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let sword;
let zombies = [];
let healthBars = new Map(); // To store zombie health bars
let isJumping = false;
let gravity = -9.8;
let playerVelocityY = 0;
let playerHeight = 5;
let dyingZombies = new Set();
let sky, sun;
let time = 0;
const DAY_DURATION = 120; // seconds for a full day/night cycle
let mountains = [];
let armGroup; // Store reference to entire arm group
let trees = [];
let fallingTrees = new Set();

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

class Game {
    constructor() {
        this.sceneManager = new SceneManager();
        this.controls = new Controls(this.sceneManager.camera, document.body);
        this.dayNightCycle = new DayNightCycle(this.sceneManager.scene);
        this.gameManager = new GameManager(this.sceneManager);
        
        // Store GameManager reference in scene
        this.sceneManager.scene.userData.gameManager = this.gameManager;
        
        this.player = new Player(this.sceneManager.camera, this.sceneManager.scene);
        // Store player reference in scene
        this.sceneManager.scene.userData.player = this.player;
        
        this.lastTime = 0;
        this.initialize();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            if (this.controls.isLocked()) {
                this.player.attack();
            }
        });
    }

    initialize() {
        this.gameManager.initializeWorld();
        this.animate(0);
    }

    animate(currentTime) {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();
    }

    update(deltaTime) {
        this.controls.update(deltaTime);
        this.dayNightCycle.update(deltaTime);
        this.gameManager.update(deltaTime);
        this.player.update(deltaTime);
    }

    render() {
        this.sceneManager.render();
    }
}

// Start the game
const game = new Game();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create sky
    sky = new THREE.Mesh(
        new THREE.SphereGeometry(500, 32, 32),
        new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            vertexColors: true
        })
    );
    
    // Create vertex colors for sky gradient
    const skyGeo = sky.geometry;
    const skyColors = [];
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
        const y = skyGeo.attributes.position.getY(i);
        if (y > 0) {
            skyColors.push(0.1, 0.3, 0.85); // Sky blue
        } else {
            skyColors.push(0.7, 0.7, 0.9); // Lighter blue at horizon
        }
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
    scene.add(sky);
    
    // Create sun
    sun = new THREE.DirectionalLight(0xffffcc, 1);
    sun.castShadow = true;
    scene.add(sun);
    
    // Add ambient light for night time
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    
    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Initialize controls
    controls = new PointerLockControls(camera, document.body);
    
    // Make ground receive shadows - updated size
    const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a472a,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Trees
    for (let i = 0; i < 100; i++) { // Reduced number of trees for better performance
        createTree(
            Math.random() * 400 - 200, // Smaller area for denser forest
            0,
            Math.random() * 400 - 200
        );
    }

    // Sword
    createSword();

    // Zombie
    createZombie();

    // Create mountain range - updated positions and sizes
    const mountainPositions = [
        { x: -2000, z: -1500, height: 800, radius: 600 },
        { x: -1500, z: -2000, height: 1000, radius: 700 },
        { x: -1000, z: -1800, height: 900, radius: 650 },
        { x: 1500, z: -1700, height: 850, radius: 620 },
        { x: 2000, z: -1900, height: 950, radius: 670 },
        { x: 1200, z: -2000, height: 750, radius: 580 },
        // Add more mountains for a fuller range
        { x: -500, z: -2200, height: 880, radius: 640 },
        { x: 500, z: -2100, height: 920, radius: 680 },
        { x: 0, z: -2500, height: 1100, radius: 750 }
    ];

    mountainPositions.forEach(pos => {
        createMountain(pos.x, pos.z, pos.height, pos.radius);
    });

    // Event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    controls.addEventListener('lock', function () {
        document.getElementById('instructions').classList.add('hidden');
    });

    controls.addEventListener('unlock', function () {
        document.getElementById('instructions').classList.remove('hidden');
    });

    camera.position.y = playerHeight;
}

function createTree(x, y, z) {
    const tree = new THREE.Group();
    
    // Create main trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 8, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a2805,
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 4; // Center the trunk at its base
    
    // Create branches with better connection points
    const createBranch = (startY, angle, length, thickness) => {
        const branchGroup = new THREE.Group();
        
        // Main branch cylinder
        const branchGeometry = new THREE.CylinderGeometry(thickness * 0.7, thickness, length, 6);
        const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
        
        // Rotate the branch cylinder so it extends outward properly
        branch.rotation.x = Math.PI / 2;
        branch.position.z = length / 2;
        
        branchGroup.add(branch);
        branchGroup.position.y = startY;
        branchGroup.rotation.z = angle;
        
        return branchGroup;
    };

    // Create foliage clusters with better connection
    const createFoliageCluster = (x, y, z, scale) => {
        const cluster = new THREE.Group();
        const leafColors = [0x0d5302, 0x0a4502, 0x0c4f02];
        
        // Create cone-shaped leaf cluster
        for (let i = 0; i < 3; i++) {
            const leafGeometry = new THREE.ConeGeometry(1.2 - i * 0.2, 2, 8);
            const leafMaterial = new THREE.MeshStandardMaterial({ 
                color: leafColors[i],
                roughness: 0.8,
                metalness: 0.1
            });
            const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
            
            // Stack leaves with slight offset
            leaves.position.y = i * 0.3;
            leaves.rotation.y = (Math.PI * 2 / 3) * i; // Rotate each layer for fuller appearance
            leaves.scale.set(scale, scale, scale);
            cluster.add(leaves);
        }
        
        cluster.position.set(x, y, z);
        return cluster;
    };

    // Create main branches at different angles
    const branches = [
        createBranch(6, Math.PI/4, 3, 0.2),
        createBranch(6, -Math.PI/4, 3, 0.2),
        createBranch(5, Math.PI/3, 2.5, 0.2),
        createBranch(5, -Math.PI/3, 2.5, 0.2),
        createBranch(4, Math.PI/6, 2, 0.15),
        createBranch(4, -Math.PI/6, 2, 0.15)
    ];

    // Add foliage to branches
    branches.forEach(branch => {
        // Calculate the end point of the branch in local space
        const branchLength = branch.children[0].geometry.parameters.height;
        const foliageScale = 0.8;
        
        // Create and position foliage at branch end
        const foliage = createFoliageCluster(
            0,
            0,
            branchLength,  // Position at end of branch
            foliageScale
        );
        
        // Add foliage to branch group
        branch.add(foliage);
    });

    // Create main top foliage
    const topFoliage = createFoliageCluster(0, 8, 0, 2);

    // Assemble tree
    tree.add(trunk);
    branches.forEach(branch => tree.add(branch));
    tree.add(topFoliage);

    // Random rotation and scale
    tree.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale, scale);
    
    // Position tree
    tree.position.set(x, 0, z);
    
    // Setup shadows
    tree.traverse(object => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    
    // Add tree properties for gameplay
    tree.health = 100;
    tree.originalRotation = tree.rotation.clone();
    tree.fallDirection = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    
    // Make sure all tree parts are properly tagged
    tree.traverse(object => {
        if (object instanceof THREE.Mesh) {
            object.userData.isTreePart = true;
            object.userData.parentTree = tree;
        }
    });
    
    tree.updateMatrix();
    tree.updateMatrixWorld();
    
    trees.push(tree);
    scene.add(tree);
    
    return tree;
}

function createSword() {
    // Create arm group
    const arm = new THREE.Group();
    armGroup = arm;
    
    // Create arm mesh with better proportions
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8);
    const forearmGeometry = new THREE.CylinderGeometry(0.07, 0.06, 0.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffdbac,
        roughness: 0.3,
        metalness: 0.1
    });
    
    // Create upper arm and forearm
    const upperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    const forearm = new THREE.Mesh(forearmGeometry, armMaterial);
    
    // Position arm parts
    upperArm.position.set(0.3, -0.1, -0.3);
    forearm.position.set(0.3, -0.4, -0.5);
    
    // Rotate arm parts for natural position
    upperArm.rotation.x = -Math.PI / 8;
    upperArm.rotation.z = Math.PI / 6;
    forearm.rotation.x = -Math.PI / 6;
    forearm.rotation.z = Math.PI / 6;
    
    // Create hand
    const handGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.08);
    const handMesh = new THREE.Mesh(handGeometry, armMaterial);
    handMesh.position.set(0.3, -0.6, -0.7);
    handMesh.rotation.x = -Math.PI / 4;
    handMesh.rotation.z = Math.PI / 6;
    
    // Create sword parts with better proportions
    const swordGroup = new THREE.Group();
    
    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.03, 1, 0.08);
    const bladeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.1
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.6;
    
    // Crossguard
    const crossGuardGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.12);
    const crossGuardMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b4513,
        metalness: 0.7,
        roughness: 0.3
    });
    const crossGuard = new THREE.Mesh(crossGuardGeometry, crossGuardMaterial);
    
    // Handle with grip texture
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3520,
        roughness: 0.9,
        metalness: 0.1
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.15;
    
    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const pommelMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b4513,
        metalness: 0.7,
        roughness: 0.3
    });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.y = -0.3;
    
    // Assemble sword
    swordGroup.add(blade);
    swordGroup.add(crossGuard);
    swordGroup.add(handle);
    swordGroup.add(pommel);
    
    // Position sword in hand
    swordGroup.position.copy(handMesh.position);
    swordGroup.rotation.x = -Math.PI / 4;
    swordGroup.rotation.y = Math.PI / 6;
    swordGroup.position.x += 0.1;
    swordGroup.position.z -= 0.1;
    
    // Add everything to the arm group
    arm.add(upperArm);
    arm.add(forearm);
    arm.add(handMesh);
    arm.add(swordGroup);
    
    // Store sword group for animation
    sword = swordGroup;
    
    // Position entire arm group
    arm.position.set(0.2, -0.3, 0.3);
    arm.rotation.x = Math.PI / 8;
    
    // Add to camera
    camera.add(arm);
    scene.add(camera);
}

function createZombie() {
    // Create zombie body parts
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    
    const zombieMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d5a27,
        transparent: true,
        opacity: 1 
    });
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3a6b32,
        transparent: true,
        opacity: 1 
    });
    
    // Create body parts
    const body = new THREE.Mesh(bodyGeometry, zombieMaterial);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    const leftArm = new THREE.Mesh(armGeometry, zombieMaterial);
    const rightArm = new THREE.Mesh(armGeometry, zombieMaterial);
    const leftLeg = new THREE.Mesh(legGeometry, zombieMaterial);
    const rightLeg = new THREE.Mesh(legGeometry, zombieMaterial);
    
    // Position body parts
    head.position.y = 0.8;
    leftArm.position.set(-0.5, 0.2, 0);
    rightArm.position.set(0.5, 0.2, 0);
    leftLeg.position.set(-0.2, -1, 0);
    rightLeg.position.set(0.2, -1, 0);
    
    // Create zombie group
    const zombie = new THREE.Group();
    zombie.add(body);
    zombie.add(head);
    zombie.add(leftArm);
    zombie.add(rightArm);
    zombie.add(leftLeg);
    zombie.add(rightLeg);
    
    // Store references for animation
    zombie.head = head;
    zombie.leftArm = leftArm;
    zombie.rightArm = rightArm;
    zombie.leftLeg = leftLeg;
    zombie.rightLeg = rightLeg;
    
    zombie.position.set(10, 2, 10);
    zombie.scale.set(1.5, 1.5, 1.5);
    zombie.health = 100;
    
    // Create health bar
    const healthBarGeometry = new THREE.PlaneGeometry(1, 0.1);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.y = 2.5;
    
    const healthBarBgGeometry = new THREE.PlaneGeometry(1, 0.1);
    const healthBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
    healthBarBg.position.y = 2.5;
    
    zombie.add(healthBarBg);
    zombie.add(healthBar);
    
    // Make zombie parts cast shadows
    zombie.children.forEach(part => {
        part.castShadow = true;
    });
    
    scene.add(zombie);
    zombies.push(zombie);
    healthBars.set(zombie, healthBar);
}

function createMountain(x, z, height, radius) {
    const segments = 32; // Increased segments for smoother appearance
    const mountainGeometry = new THREE.ConeGeometry(radius, height, segments);
    const mountainMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a4a4a,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true 
    });
    
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.set(x, height/2, z);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    
    // Add more natural variation to vertices
    const vertices = mountainGeometry.attributes.position.array;
    for(let i = 0; i < vertices.length; i += 3) {
        if(i > segments * 3) { // Don't modify the peak too much
            const noise = Math.pow(Math.random(), 2) * radius * 0.15; // More natural noise distribution
            const angle = Math.random() * Math.PI * 2;
            vertices[i] += Math.cos(angle) * noise;
            vertices[i + 2] += Math.sin(angle) * noise;
            // Add some vertical variation too
            vertices[i + 1] += (Math.random() - 0.5) * height * 0.1;
        }
    }
    mountainGeometry.attributes.position.needsUpdate = true;
    mountainGeometry.computeVertexNormals(); // Recalculate normals for better lighting
    
    mountains.push(mountain);
    scene.add(mountain);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (!isJumping) {
                isJumping = true;
                playerVelocityY = 5;
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Update day/night cycle
    time += 0.016; // Approximately 60 FPS
    const dayProgress = (time % DAY_DURATION) / DAY_DURATION;
    const sunAngle = dayProgress * Math.PI * 2;
    
    // Update sun position
    sun.position.x = Math.cos(sunAngle) * 100;
    sun.position.y = Math.sin(sunAngle) * 100;
    sun.position.z = 0;
    
    // Update sun intensity based on height
    const sunHeight = Math.max(0, Math.sin(sunAngle));
    sun.intensity = sunHeight * 1.5;
    
    // Update sky colors
    const skyGeo = sky.geometry;
    const skyColors = [];
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
        const y = skyGeo.attributes.position.getY(i);
        if (y > 0) {
            // Sky color transitions
            const dayColor = new THREE.Color(0.1, 0.3, 0.85); // Day blue
            const nightColor = new THREE.Color(0.0, 0.0, 0.1); // Night dark blue
            const sunsetColor = new THREE.Color(0.8, 0.3, 0.1); // Sunset orange
            
            let finalColor;
            if (sunHeight < 0.2) { // Night
                finalColor = nightColor;
            } else if (sunHeight < 0.4) { // Sunset/Sunrise
                const t = (sunHeight - 0.2) / 0.2;
                finalColor = nightColor.lerp(sunsetColor, t);
            } else if (sunHeight < 0.6) { // Sunset/Sunrise to Day
                const t = (sunHeight - 0.4) / 0.2;
                finalColor = sunsetColor.lerp(dayColor, t);
            } else { // Day
                finalColor = dayColor;
            }
            
            skyColors.push(finalColor.r, finalColor.g, finalColor.b);
        } else {
            // Horizon color
            const horizonColor = new THREE.Color(0.7, 0.7, 0.9);
            skyColors.push(horizonColor.r, horizonColor.g, horizonColor.b);
        }
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
    skyGeo.attributes.color.needsUpdate = true;
    
    // Update zombie visibility in darkness
    zombies.forEach(zombie => {
        if (!dyingZombies.has(zombie)) {
            const zombieMaterial = zombie.children[0].material;
            // Make zombies glow slightly in darkness
            const emmissiveIntensity = Math.max(0.2, 1 - sunHeight);
            zombieMaterial.emissive = new THREE.Color(0x2d5a27);
            zombieMaterial.emissiveIntensity = emmissiveIntensity;
        }
    });

    // Update mountain colors based on sunlight
    mountains.forEach(mountain => {
        const baseMountainColor = new THREE.Color(0x4a4a4a);
        const nightMountainColor = new THREE.Color(0x252525);
        const sunsetMountainColor = new THREE.Color(0x7c5f5f);
        
        let finalColor;
        if (sunHeight < 0.2) { // Night
            finalColor = nightMountainColor;
        } else if (sunHeight < 0.4) { // Sunset/Sunrise
            const t = (sunHeight - 0.2) / 0.2;
            finalColor = nightMountainColor.lerp(sunsetMountainColor, t);
        } else if (sunHeight < 0.6) { // Sunset/Sunrise to Day
            const t = (sunHeight - 0.4) / 0.2;
            finalColor = sunsetMountainColor.lerp(baseMountainColor, t);
        } else { // Day
            finalColor = baseMountainColor;
        }
        
        mountain.material.color.copy(finalColor);
    });

    if (controls.isLocked === true) {
        const delta = 0.1;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        if (isJumping) {
            playerVelocityY += gravity * delta;
            camera.position.y += playerVelocityY * delta;

            if (camera.position.y <= playerHeight) {
                isJumping = false;
                playerVelocityY = 0;
                camera.position.y = playerHeight;
            }
        }

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 100.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 100.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
    }

    // Animate zombies
    zombies.forEach(zombie => {
        if (dyingZombies.has(zombie)) {
            // Death animation
            const deathDuration = 1000; // 1 second
            const timeSinceDeath = Date.now() - zombie.deathTime;
            const deathProgress = Math.min(timeSinceDeath / deathDuration, 1);
            
            // Fall over
            zombie.rotation.x = deathProgress * (Math.PI / 2);
            
            // Sink into ground
            zombie.position.y = zombie.originalPosition * (1 - deathProgress);
            
            // Fade out
            zombie.children.forEach(part => {
                if (part.material && part.material.opacity !== undefined) {
                    part.material.transparent = true;
                    part.material.opacity = 1 - deathProgress;
                }
            });
            
            // Remove zombie when animation is complete
            if (deathProgress >= 1) {
                scene.remove(zombie);
                zombies = zombies.filter(z => z !== zombie);
                healthBars.delete(zombie);
                dyingZombies.delete(zombie);
            }
            return; // Skip regular zombie animations for dying zombies
        }

        // Regular zombie animations
        const healthBar = zombie.children[zombie.children.length - 1];
        const healthBarBg = zombie.children[zombie.children.length - 2];
        
        if (healthBar && healthBarBg) {
            healthBar.lookAt(camera.position);
            healthBarBg.lookAt(camera.position);
        }
        
        // Update zombie movement
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, zombie.position);
        direction.normalize();
        zombie.position.add(direction.multiplyScalar(0.02));
        
        // Make zombie face player
        zombie.lookAt(camera.position);
        
        // Animate limbs
        const time = Date.now() * 0.002;
        const walkSpeed = 2;
        
        // Shambling head movement
        if (zombie.head) {
            zombie.head.rotation.x = Math.sin(time * 0.5) * 0.1;
            zombie.head.rotation.z = Math.cos(time * 0.5) * 0.1;
        }
        
        // Arm swing
        if (zombie.leftArm && zombie.rightArm) {
            zombie.leftArm.rotation.x = Math.sin(time * walkSpeed) * 0.5;
            zombie.rightArm.rotation.x = Math.sin(time * walkSpeed + Math.PI) * 0.5;
            zombie.leftArm.rotation.z = Math.PI * 0.1;
            zombie.rightArm.rotation.z = -Math.PI * 0.1;
        }
        
        // Leg movement
        if (zombie.leftLeg && zombie.rightLeg) {
            zombie.leftLeg.rotation.x = Math.sin(time * walkSpeed) * 0.5;
            zombie.rightLeg.rotation.x = Math.sin(time * walkSpeed + Math.PI) * 0.5;
        }
    });

    // Animate falling trees
    trees.forEach(tree => {
        if (fallingTrees.has(tree)) {
            const fallDuration = 2000; // 2 seconds to fall
            const timeSinceFall = Date.now() - tree.fallTime;
            const fallProgress = Math.min(timeSinceFall / fallDuration, 1);
            
            // Ease out function for natural fall
            const easeOut = t => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOut(fallProgress);
            
            // Calculate fall rotation
            const fallAngle = Math.PI / 2; // 90 degrees
            const currentAngle = easedProgress * fallAngle;
            
            // Apply rotation based on fall direction
            tree.rotation.copy(tree.fallStartRotation);
            tree.rotateOnWorldAxis(
                new THREE.Vector3(tree.fallDirection.x, 0, tree.fallDirection.z),
                currentAngle
            );
            
            // Add some bounce at the end
            if (fallProgress > 0.8) {
                const bounce = Math.sin((fallProgress - 0.8) * 5 * Math.PI) * 0.05 * (1 - (fallProgress - 0.8) / 0.2);
                tree.position.y = bounce;
            }
            
            // Add shake during fall
            if (fallProgress < 0.9) {
                const shake = Math.sin(fallProgress * 50) * 0.02 * (1 - fallProgress);
                tree.rotation.z += shake;
            }
            
            // Remove tree after animation
            if (fallProgress >= 1) {
                // Leave fallen tree in place
                fallingTrees.delete(tree);
                trees = trees.filter(t => t !== tree);
                
                // Optional: spawn new tree somewhere else after delay
                setTimeout(() => {
                    const newTree = createTree(
                        Math.random() * 800 - 400,
                        0,
                        Math.random() * 800 - 400
                    );
                    scene.add(newTree);
                }, 10000);
            }
        }
    });

    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
