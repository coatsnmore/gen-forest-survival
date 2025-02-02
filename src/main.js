import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

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

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();
animate();

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
    for (let i = 0; i < 200; i++) { // More trees
        createTree(
            Math.random() * 800 - 400, // Spread trees over larger area
            0,
            Math.random() * 800 - 400
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
    document.addEventListener('click', function () {
        if (!controls.isLocked) {
            controls.lock();
        } else {
            attack(); // Attack when clicking if game is running
        }
    });

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
    const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 8, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a2805,
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 4;

    // Create multiple layers of leaves for fuller appearance
    const treeTop = new THREE.Group();
    const leafColors = [0x0d5302, 0x0a4502, 0x0c4f02];
    
    for(let i = 0; i < 3; i++) {
        const leafGeometry = new THREE.ConeGeometry(3 - i * 0.3, 6, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: leafColors[i],
            roughness: 0.8,
            metalness: 0.1
        });
        const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
        leaves.position.y = i * 2;
        treeTop.add(leaves);
    }
    
    treeTop.position.y = 8;

    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(treeTop);
    
    // Add some random rotation and scale variation
    tree.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale, scale);
    
    tree.position.set(x, 0, z);
    trunk.castShadow = true;
    treeTop.children.forEach(leaves => leaves.castShadow = true);
    
    scene.add(tree);
}

function createSword() {
    const swordGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const swordMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    sword = new THREE.Mesh(swordGeometry, swordMaterial);
    sword.position.set(0.5, -0.5, -1);
    camera.add(sword);
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

function attack() {
    sword.rotation.x = Math.PI / 4;
    setTimeout(() => {
        sword.rotation.x = 0;
    }, 200);

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, camera);
    
    const ATTACK_RANGE = 3;
    const DAMAGE = 34;

    zombies.forEach(zombie => {
        if (dyingZombies.has(zombie)) return; // Skip zombies that are already dying
        
        const distanceToZombie = zombie.position.distanceTo(camera.position);
        
        if (distanceToZombie <= ATTACK_RANGE) {
            const directionToZombie = new THREE.Vector3()
                .subVectors(zombie.position, camera.position)
                .normalize();
            const dot = directionToZombie.dot(raycaster.ray.direction);
            
            if (dot > 0.5) {
                zombie.health -= DAMAGE;
                
                const healthBar = healthBars.get(zombie);
                if (healthBar) {
                    healthBar.scale.x = Math.max(zombie.health / 100, 0);
                }
                
                // Hit flash
                zombie.children.forEach(part => {
                    if (part.material && part.material.color) {
                        const originalColor = part.material.color.getHex();
                        part.material.color.setHex(0xff0000);
                        setTimeout(() => {
                            part.material.color.setHex(originalColor);
                        }, 100);
                    }
                });

                if (zombie.health <= 0 && !dyingZombies.has(zombie)) {
                    // Start death animation
                    dyingZombies.add(zombie);
                    zombie.deathTime = Date.now();
                    zombie.originalPosition = zombie.position.y;
                    
                    // Hide health bar immediately
                    const healthBar = zombie.children[zombie.children.length - 1];
                    const healthBarBg = zombie.children[zombie.children.length - 2];
                    healthBar.visible = false;
                    healthBarBg.visible = false;
                    
                    // Spawn new zombie after delay
                    setTimeout(createZombie, 3000);
                }
            }
        }
    });
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

    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
