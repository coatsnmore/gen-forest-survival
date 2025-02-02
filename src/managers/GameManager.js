import * as THREE from 'three';
import { Tree } from '../components/Tree';
import { Zombie } from '../components/Zombie';
import { GAME_SETTINGS } from '../utils/constants';
import { HealthPickup } from '../components/HealthPickup';

export class GameManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.trees = [];
        this.zombies = [];
        this.fallingTrees = new Set();
        this.dyingZombies = new Set();
        this.healthBars = new Map();
        this.healthPickups = [];
        this.HEALTH_PICKUP_COUNT = 5;
        this.HEALTH_PICKUP_RESPAWN_TIME = 15000; // 15 seconds
    }

    initializeWorld() {
        this.createGround();
        this.createTrees();
        this.createMountains();
        this.createZombies();
        this.createHealthPickups();
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a472a,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.sceneManager.add(ground);
    }

    createTrees() {
        for (let i = 0; i < 100; i++) {
            const tree = new Tree(new THREE.Vector3(
                Math.random() * 400 - 200,
                0,
                Math.random() * 400 - 200
            ));
            this.trees.push(tree);
            this.sceneManager.add(tree);
        }
    }

    createMountains() {
        // Mountain creation logic
    }

    createZombies() {
        // Create initial zombies
        for (let i = 0; i < 5; i++) {
            const position = this.getRandomSpawnPosition();
            const zombie = new Zombie(position, this.sceneManager.scene);
            this.zombies.push(zombie);
            this.sceneManager.add(zombie);
        }

        // Spawn new zombies periodically
        setInterval(() => {
            if (this.zombies.length < 10) {
                const position = this.getRandomSpawnPosition();
                const zombie = new Zombie(position, this.sceneManager.scene);
                this.zombies.push(zombie);
                this.sceneManager.add(zombie);
            }
        }, 5000);
    }

    getRandomSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 30; // Spawn between 50-80 units away
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
    }

    createHealthPickups() {
        for (let i = 0; i < this.HEALTH_PICKUP_COUNT; i++) {
            this.spawnHealthPickup();
        }
    }

    spawnHealthPickup() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 30; // Spawn between 20-50 units from center
        const position = new THREE.Vector3(
            Math.cos(angle) * distance,
            1.5, // Height above ground
            Math.sin(angle) * distance
        );
        
        const pickup = new HealthPickup(position);
        this.healthPickups.push(pickup);
        this.sceneManager.add(pickup);
    }

    update(deltaTime) {
        this.updateTrees(deltaTime);
        this.updateZombies(deltaTime);
        this.updateHealthPickups(deltaTime);
    }

    updateTrees(deltaTime) {
        this.trees.forEach(tree => tree.update(deltaTime));
    }

    updateZombies(deltaTime) {
        const playerPosition = this.sceneManager.camera.position.clone();
        
        this.zombies.forEach(zombie => {
            if (this.dyingZombies.has(zombie)) {
                this.updateDyingZombie(zombie);
            } else {
                zombie.update(deltaTime, playerPosition);
                
                // Check if zombie died from damage
                if (zombie.health <= 0 && !this.dyingZombies.has(zombie)) {
                    this.startZombieDeath(zombie);
                }
            }
        });
    }

    startZombieDeath(zombie) {
        this.dyingZombies.add(zombie);
        zombie.deathTime = Date.now();
        zombie.originalPosition = zombie.position.y;
    }

    updateDyingZombie(zombie) {
        const deathDuration = 1000;
        const timeSinceDeath = Date.now() - zombie.deathTime;
        const deathProgress = Math.min(timeSinceDeath / deathDuration, 1);
        
        zombie.updateDeath(deathProgress);
        
        if (deathProgress >= 1) {
            this.sceneManager.remove(zombie);
            this.zombies = this.zombies.filter(z => z !== zombie);
            this.healthBars.delete(zombie);
            this.dyingZombies.delete(zombie);

            // Respawn zombie after delay
            setTimeout(() => {
                const position = this.getRandomSpawnPosition();
                const newZombie = new Zombie(position, this.sceneManager.scene);
                this.zombies.push(newZombie);
                this.sceneManager.add(newZombie);
            }, 3000); // 3 seconds delay
        }
    }

    updateHealthPickups(deltaTime) {
        // Update animations
        this.healthPickups.forEach(pickup => pickup.update(deltaTime));

        // Check for player collision
        const player = this.scene.userData.player;
        if (player) {
            // Use forEach with index to safely remove items
            [...this.healthPickups].forEach((pickup, index) => {
                // Get player position without Y component for better ground collision
                const playerPos = new THREE.Vector3(
                    player.camera.position.x,
                    pickup.position.y,
                    player.camera.position.z
                );
                
                const distance = pickup.position.distanceTo(playerPos);
                const PICKUP_RADIUS = 3; // Increased pickup radius
                
                if (distance < PICKUP_RADIUS && player.health < player.maxHealth) {
                    // Create pickup effect
                    this.createPickupEffect(pickup.position);
                    
                    // Heal player
                    player.heal(10); // Heal 10 health points gradually
                    
                    // Remove pickup
                    this.sceneManager.remove(pickup);
                    this.healthPickups.splice(index, 1);
                    
                    // Spawn new pickup after delay
                    setTimeout(() => this.spawnHealthPickup(), this.HEALTH_PICKUP_RESPAWN_TIME);
                }
            });
        }
    }

    createPickupEffect(position) {
        // Create particles or effect when health is picked up
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 1
                })
            );
            
            // Random starting position near pickup
            particle.position.copy(position).add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * 0.5,
                    (Math.random() - 0.5) * 0.5
                )
            );
            
            // Random velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            
            particles.add(particle);
        }
        
        this.sceneManager.add(particles);
        
        // Animate particles
        const startTime = Date.now();
        const duration = 1000; // 1 second
        
        const animateParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                particles.children.forEach(particle => {
                    particle.position.add(particle.velocity.clone().multiplyScalar(0.016));
                    particle.material.opacity = 1 - progress;
                });
                requestAnimationFrame(animateParticles);
            } else {
                this.sceneManager.remove(particles);
            }
        };
        
        animateParticles();
    }
} 