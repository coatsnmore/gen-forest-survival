import * as THREE from 'three';
import { Tree } from '../components/Tree';
import { Zombie } from '../components/Zombie';
import { GAME_SETTINGS } from '../utils/constants';

export class GameManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.trees = [];
        this.zombies = [];
        this.fallingTrees = new Set();
        this.dyingZombies = new Set();
        this.healthBars = new Map();
    }

    initializeWorld() {
        this.createGround();
        this.createTrees();
        this.createMountains();
        this.createZombies();
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
            const position = new THREE.Vector3(
                Math.random() * 40 - 20,
                2,
                Math.random() * 40 - 20
            );
            const zombie = new Zombie(position);
            this.zombies.push(zombie);
            this.sceneManager.add(zombie);
        }

        // Spawn new zombies periodically
        setInterval(() => {
            if (this.zombies.length < 10) { // Max zombies
                const angle = Math.random() * Math.PI * 2;
                const distance = 30; // Spawn distance from player
                const position = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    2,
                    Math.sin(angle) * distance
                );
                const zombie = new Zombie(position);
                this.zombies.push(zombie);
                this.sceneManager.add(zombie);
            }
        }, 5000); // Every 5 seconds
    }

    update(deltaTime) {
        this.updateTrees(deltaTime);
        this.updateZombies(deltaTime);
    }

    updateTrees(deltaTime) {
        this.trees.forEach(tree => tree.update(deltaTime));
    }

    updateZombies(deltaTime) {
        this.zombies.forEach(zombie => {
            if (this.dyingZombies.has(zombie)) {
                this.updateDyingZombie(zombie);
            } else {
                zombie.update(deltaTime, this.sceneManager.camera.position);
                
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
        }
    }
} 