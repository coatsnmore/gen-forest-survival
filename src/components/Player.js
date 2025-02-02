import * as THREE from 'three';
import { GAME_SETTINGS } from '../utils/constants';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.isAttacking = false;
        this.createArm();
        
        // Make sure camera is at proper height
        this.camera.position.y = GAME_SETTINGS.PLAYER_HEIGHT;
        
        // Add camera to scene
        this.scene.add(this.camera);
    }

    createArm() {
        // Create arm group
        this.armGroup = new THREE.Group();
        
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
        
        // Create sword
        this.sword = this.createSword();
        
        // Add everything to the arm group
        this.armGroup.add(upperArm);
        this.armGroup.add(forearm);
        this.armGroup.add(handMesh);
        this.armGroup.add(this.sword);
        
        // Position entire arm group
        this.armGroup.position.set(0.2, -0.3, 0.3);
        this.armGroup.rotation.x = Math.PI / 8;
        
        // Add to camera
        this.camera.add(this.armGroup);
    }

    createSword() {
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
        
        // Handle
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
        swordGroup.position.set(0.4, -0.6, -0.8);
        swordGroup.rotation.set(-Math.PI / 4, Math.PI / 6, 0);
        
        // Enable shadows
        swordGroup.traverse(object => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
        return swordGroup;
    }

    attack() {
        if (this.isAttacking) return false;
        
        this.isAttacking = true;
        const ATTACK_DURATION = 300;
        const startTime = Date.now();
        
        // Get reference to GameManager's zombies
        const zombies = [];
        this.scene.traverse((object) => {
            if (object.userData && object.userData.isZombie) {
                zombies.push(object);
            }
        });
        
        // Check for hits
        zombies.forEach(zombie => {
            const distance = zombie.position.distanceTo(this.camera.position);
            if (distance <= GAME_SETTINGS.ATTACK_RANGE) {
                const directionToZombie = new THREE.Vector3()
                    .subVectors(zombie.position, this.camera.position)
                    .normalize();
                const cameraDirection = new THREE.Vector3();
                this.camera.getWorldDirection(cameraDirection);
                const dot = directionToZombie.dot(cameraDirection);
                
                if (dot > 0.5) { // In front of player
                    const isDead = zombie.damage(GAME_SETTINGS.DAMAGE.SWORD);
                    if (isDead) {
                        // Let the GameManager handle zombie death
                        const gameManager = this.scene.userData.gameManager;
                        if (gameManager) {
                            gameManager.startZombieDeath(zombie);
                        }
                    }
                }
            }
        });

        // Attack animation
        const animate = () => {
            if (!this.isAttacking) return;
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / ATTACK_DURATION, 1);
            
            // Swing arc
            const swingAngle = Math.sin(progress * Math.PI) * (Math.PI / 3);
            this.armGroup.rotation.x = Math.PI / 8 + swingAngle;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.armGroup.rotation.x = Math.PI / 8;
                this.isAttacking = false;
            }
        };
        
        animate();
        return true;
    }

    update(deltaTime) {
        // Add any continuous updates needed
    }
} 