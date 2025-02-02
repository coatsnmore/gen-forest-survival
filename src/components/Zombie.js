import * as THREE from 'three';
import { GAME_SETTINGS } from '../utils/constants';

export class Zombie extends THREE.Group {
    constructor(position, scene) {
        super();
        this.scene = scene;
        this.health = 100;
        this.userData.isZombie = true;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.ATTACK_RANGE = 3; // Increased attack range
        this.ATTACK_DAMAGE = 10;
        this.ATTACK_COOLDOWN = 1;
        this.MOVE_SPEED = 3; // Increased speed
        this.PUSH_DISTANCE = 4; // Increased push distance
        this.PUSH_STRENGTH = 8;
        this.FRICTION = 0.85;
        
        this.createZombie();
        
        position.y = 2.5; // Adjusted for new scale
        this.position.copy(position);
        this.originalPosition = position.y;
        this.velocity = new THREE.Vector3();
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
        
        // Position body parts relative to center
        this.head.position.y = 0.8;
        this.leftArm.position.set(-0.5, 0.2, 0);
        this.rightArm.position.set(0.5, 0.2, 0);
        this.leftLeg.position.set(-0.2, -0.6, 0); // Adjusted leg positions
        this.rightLeg.position.set(0.2, -0.6, 0); // to be closer to body
        
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

        this.scale.set(2.5, 2.5, 2.5);
    }

    createHealthBar() {
        const healthBarGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        this.healthBar.position.y = 4;
        
        const healthBarBgGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        this.healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
        this.healthBarBg.position.y = 4;
        
        this.add(this.healthBarBg);
        this.add(this.healthBar);
    }

    update(deltaTime, playerPosition) {
        // Update health bar
        this.healthBar.lookAt(playerPosition);
        this.healthBarBg.lookAt(playerPosition);
        
        // Get player's collision boundary
        const player = this.scene.userData.player;
        const playerBoundary = player ? player.collisionBoundary : null;
        
        // Calculate direction and distance to player
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
        const distance = toPlayer.length();
        const direction = toPlayer.normalize();

        // Handle pushing based on collision with player boundary
        if (playerBoundary) {
            const distanceToCenter = this.position.distanceTo(playerBoundary.position);
            const collisionDistance = playerBoundary.geometry.parameters.radiusTop + 1; // Add 1 for zombie's own size

            if (distanceToCenter < collisionDistance) {
                // Calculate push force (stronger when closer)
                const pushFactor = 1 - (distanceToCenter / collisionDistance);
                const pushForce = new THREE.Vector3()
                    .subVectors(this.position, playerBoundary.position)
                    .setY(0) // Keep push force horizontal
                    .normalize()
                    .multiplyScalar(this.PUSH_STRENGTH * pushFactor * 2); // Doubled strength for more noticeable push
                
                // Apply push force to velocity
                this.velocity.add(pushForce.multiplyScalar(deltaTime));
            }
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Handle movement
        if (distance > this.PUSH_DISTANCE && !this.isAttacking) {
            const moveForce = direction.multiplyScalar(this.MOVE_SPEED * deltaTime);
            this.velocity.add(moveForce);
        }

        // Attack if in range
        if (distance <= this.ATTACK_RANGE && this.attackCooldown <= 0) {
            this.attack(playerPosition);
        }

        // Apply friction
        this.velocity.multiplyScalar(this.FRICTION);

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Look at player but don't tilt
        const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPosition, this.position)
            .setY(0); // Keep vertical direction unchanged
        const lookAtPos = new THREE.Vector3()
            .copy(this.position)
            .add(directionToPlayer);
        this.lookAt(lookAtPos);
        
        // Animate based on state
        this.animate(deltaTime, distance <= this.ATTACK_RANGE);
    }

    attack(playerPosition) {
        this.isAttacking = true;
        this.attackCooldown = this.ATTACK_COOLDOWN;
        
        // Get player component from scene
        const player = this.scene.userData.player;
        if (player) {
            // Check if player is in front of zombie
            const directionToPlayer = new THREE.Vector3()
                .subVectors(playerPosition, this.position)
                .normalize();
            const zombieDirection = new THREE.Vector3(0, 0, 1)
                .applyQuaternion(this.quaternion);
            const dot = directionToPlayer.dot(zombieDirection);
            
            // If player is in front (dot > 0.5 means within ~90 degrees)
            if (dot > 0.5) {
                player.takeDamage(this.ATTACK_DAMAGE);
                console.log('Player hit! Damage:', this.ATTACK_DAMAGE);
            }
        }
        
        // Trigger attack animation
        const attackDuration = 0.5;
        const startTime = Date.now();
        
        const animateAttack = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / attackDuration, 1);
            
            // Lunge forward animation
            if (progress < 0.5) {
                this.position.y = this.originalPosition + Math.sin(progress * Math.PI) * 0.5;
                if (this.leftArm && this.rightArm) {
                    const armAngle = Math.PI * 0.5 * progress;
                    this.leftArm.rotation.x = armAngle;
                    this.rightArm.rotation.x = armAngle;
                }
            } else {
                this.position.y = this.originalPosition + Math.sin((1 - progress) * Math.PI) * 0.5;
                if (this.leftArm && this.rightArm) {
                    const armAngle = Math.PI * 0.5 * (1 - progress);
                    this.leftArm.rotation.x = armAngle;
                    this.rightArm.rotation.x = armAngle;
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateAttack);
            } else {
                this.isAttacking = false;
            }
        };
        
        animateAttack();
    }

    animate(deltaTime, isInAttackRange) {
        const time = Date.now() * 0.002;
        const walkSpeed = isInAttackRange ? 0 : 2; // Stop walking animation when in attack range
        
        // Shambling head movement
        if (!this.isAttacking) {
            this.head.rotation.x = Math.sin(time * 0.5) * 0.1;
            this.head.rotation.z = Math.cos(time * 0.5) * 0.1;
            
            // Arm swing only when walking
            if (!isInAttackRange) {
                this.leftArm.rotation.x = Math.sin(time * walkSpeed) * 0.5;
                this.rightArm.rotation.x = Math.sin(time * walkSpeed + Math.PI) * 0.5;
                this.leftArm.rotation.z = Math.PI * 0.1;
                this.rightArm.rotation.z = -Math.PI * 0.1;
                
                // Leg movement
                this.leftLeg.rotation.x = Math.sin(time * walkSpeed) * 0.5;
                this.rightLeg.rotation.x = Math.sin(time * walkSpeed + Math.PI) * 0.5;
            }
        }
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