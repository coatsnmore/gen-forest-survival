import * as THREE from 'three';

export class HealthPickup extends THREE.Group {
    constructor(position) {
        super();
        this.HEAL_AMOUNT = 50;
        this.ROTATION_SPEED = 1;
        this.HOVER_HEIGHT = 0.5;
        this.HOVER_SPEED = 2;
        this.startTime = Date.now();
        this.startY = position.y;
        
        this.createHealthPickup();
        this.position.copy(position);
    }

    createHealthPickup() {
        // Create cross shape
        const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.2);
        const boxGeometry2 = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5,
            metalness: 0.7,
            roughness: 0.3
        });

        const horizontalBox = new THREE.Mesh(boxGeometry, material);
        const verticalBox = new THREE.Mesh(boxGeometry2, material);
        
        this.add(horizontalBox);
        this.add(verticalBox);

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.add(glow);

        // Setup shadows
        this.traverse(object => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
    }

    update(deltaTime) {
        // Rotate the pickup
        this.rotation.y += this.ROTATION_SPEED * deltaTime;
        
        // Hover effect
        const time = (Date.now() - this.startTime) / 1000;
        this.position.y = this.startY + Math.sin(time * this.HOVER_SPEED) * this.HOVER_HEIGHT;
    }
} 