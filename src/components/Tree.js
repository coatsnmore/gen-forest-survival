import * as THREE from 'three';
import { COLORS, GAME_SETTINGS } from '../utils/constants';

export class Tree extends THREE.Group {
    constructor(position) {
        super();
        this.health = 100;
        this.isFalling = false;
        this.createTree();
        this.position.copy(position);
    }

    createTrunk() {
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 8, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: COLORS.TREE.TRUNK,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        return trunk;
    }

    createBranches() {
        const branches = [];
        const createBranch = (startY, angle, length, thickness) => {
            const branchGroup = new THREE.Group();
            const branchGeometry = new THREE.CylinderGeometry(thickness * 0.7, thickness, length, 6);
            const branch = new THREE.Mesh(branchGeometry, this.trunk.material);
            branch.rotation.x = Math.PI / 2;
            branch.position.z = length / 2;
            branchGroup.add(branch);
            branchGroup.position.y = startY;
            branchGroup.rotation.z = angle;
            return branchGroup;
        };

        const branchConfigs = [
            [6, Math.PI/4, 3, 0.2],
            [6, -Math.PI/4, 3, 0.2],
            [5, Math.PI/3, 2.5, 0.2],
            [5, -Math.PI/3, 2.5, 0.2],
            [4, Math.PI/6, 2, 0.15],
            [4, -Math.PI/6, 2, 0.15]
        ];

        branchConfigs.forEach(config => {
            branches.push(createBranch(...config));
        });

        return branches;
    }

    createFoliage() {
        const createFoliageCluster = (x, y, z, scale) => {
            const cluster = new THREE.Group();
            COLORS.TREE.LEAVES.forEach((color, i) => {
                const leafGeometry = new THREE.ConeGeometry(1.2 - i * 0.2, 2, 8);
                const leafMaterial = new THREE.MeshStandardMaterial({ 
                    color,
                    roughness: 0.8,
                    metalness: 0.1
                });
                const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
                leaves.position.y = i * 0.3;
                leaves.rotation.y = (Math.PI * 2 / 3) * i;
                leaves.scale.set(scale, scale, scale);
                leaves.castShadow = true;
                cluster.add(leaves);
            });
            cluster.position.set(x, y, z);
            return cluster;
        };

        return createFoliageCluster(0, 8, 0, 2);
    }

    createTree() {
        this.trunk = this.createTrunk();
        this.branches = this.createBranches();
        this.foliage = this.createFoliage();
        
        this.add(this.trunk);
        this.branches.forEach(branch => this.add(branch));
        this.add(this.foliage);

        // Random rotation and scale
        this.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.8 + Math.random() * 0.4;
        this.scale.set(scale, scale, scale);
    }

    damage(amount) {
        if (this.isFalling) return;
        
        this.health -= amount;
        this.showHitEffect();
        
        if (this.health <= 0) {
            this.startFalling();
        }
    }

    showHitEffect() {
        // Hit effect implementation
    }

    startFalling() {
        this.isFalling = true;
        this.fallStartTime = Date.now();
        this.fallStartRotation = this.rotation.clone();
    }

    update(deltaTime) {
        if (this.isFalling) {
            this.updateFallAnimation(deltaTime);
        }
    }

    updateFallAnimation(deltaTime) {
        const fallDuration = 2000;
        const timeSinceFall = Date.now() - this.fallStartTime;
        const fallProgress = Math.min(timeSinceFall / fallDuration, 1);
        
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOut(fallProgress);
        
        const fallAngle = Math.PI / 2;
        const currentAngle = easedProgress * fallAngle;
        
        this.rotation.copy(this.fallStartRotation);
        this.rotateOnWorldAxis(
            new THREE.Vector3(this.fallDirection.x, 0, this.fallDirection.z),
            currentAngle
        );
        
        if (fallProgress > 0.8) {
            const bounce = Math.sin((fallProgress - 0.8) * 5 * Math.PI) * 0.05 * (1 - (fallProgress - 0.8) / 0.2);
            this.position.y = bounce;
        }
    }
} 