import * as THREE from 'three';
import { GAME_SETTINGS } from '../utils/constants';

export class Zombie extends THREE.Group {
    constructor(position) {
        super();
        this.health = 100;
        this.userData.isZombie = true;
        this.createZombie();
        this.position.copy(position);
        this.originalPosition = position.y;
    }

    createZombie() {
        // Create zombie body parts
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        
        const zombieMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5a27,
            transparent: true,
            opacity: 1,
            emissive: 0x000000
        });
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a6b32,
            transparent: true,
            opacity: 1 
        });
        
        // Create body parts
        this.body = new THREE.Mesh(bodyGeometry, zombieMaterial.clone());
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.leftArm = new THREE.Mesh(armGeometry, zombieMaterial.clone());
        this.rightArm = new THREE.Mesh(armGeometry, zombieMaterial.clone());
        this.leftLeg = new THREE.Mesh(legGeometry, zombieMaterial.clone());
        this.rightLeg = new THREE.Mesh(legGeometry, zombieMaterial.clone());
        
        // Position body parts
        this.head.position.y = 0.8;
        this.leftArm.position.set(-0.5, 0.2, 0);
        this.rightArm.position.set(0.5, 0.2, 0);
        this.leftLeg.position.set(-0.2, -1, 0);
        this.rightLeg.position.set(0.2, -1, 0);
        
        // Add all parts to zombie
        this.add(this.body);
        this.add(this.head);
        this.add(this.leftArm);
        this.add(this.rightArm);
        this.add(this.leftLeg);
        this.add(this.rightLeg);
        
        // Create health bar
        this.createHealthBar();
        
        // Setup shadows
        this.traverse(part => {
            if (part instanceof THREE.Mesh) {
                part.castShadow = true;
            }
        });

        this.scale.set(1.5, 1.5, 1.5);
    }

    createHealthBar() {
        const healthBarGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        this.healthBar.position.y = 2.5;
        
        const healthBarBgGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        this.healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
        this.healthBarBg.position.y = 2.5;
        
        this.add(this.healthBarBg);
        this.add(this.healthBar);
    }

    update(deltaTime, playerPosition) {
        // Update health bar
        this.healthBar.lookAt(playerPosition);
        this.healthBarBg.lookAt(playerPosition);
        
        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, this.position);
        direction.normalize();
        this.position.add(direction.multiplyScalar(0.02));
        
        // Look at player
        this.lookAt(playerPosition);
        
        // Animate limbs
        const time = Date.now() * 0.002;
        const walkSpeed = 2;
        
        // Shambling head movement
        this.head.rotation.x = Math.sin(time * 0.5) * 0.1;
        this.head.rotation.z = Math.cos(time * 0.5) * 0.1;
        
        // Arm swing
        this.leftArm.rotation.x = Math.sin(time * walkSpeed) * 0.5;
        this.rightArm.rotation.x = Math.sin(time * walkSpeed + Math.PI) * 0.5;
        this.leftArm.rotation.z = Math.PI * 0.1;
        this.rightArm.rotation.z = -Math.PI * 0.1;
        
        // Leg movement
        this.leftLeg.rotation.x = Math.sin(time * walkSpeed) * 0.5;
        this.rightLeg.rotation.x = Math.sin(time * walkSpeed + Math.PI) * 0.5;
    }

    updateDeath(progress) {
        // Fall over
        this.rotation.x = progress * (Math.PI / 2);
        
        // Sink into ground
        this.position.y = this.originalPosition * (1 - progress);
        
        // Fade out
        this.traverse(part => {
            if (part.material && part.material.opacity !== undefined) {
                part.material.transparent = true;
                part.material.opacity = 1 - progress;
            }
        });
    }

    damage(amount) {
        this.health -= amount;
        // Update health bar scale
        this.healthBar.scale.x = Math.max(0, this.health / 100);
        
        // Visual feedback for hit
        if (this.body && this.body.material) {
            this.body.material.emissive.setHex(0xff0000);
            setTimeout(() => {
                this.body.material.emissive.setHex(0x000000);
            }, 100);
        }
        
        console.log('Zombie hit! Health:', this.health); // Debug log
        return this.health <= 0;
    }
} 