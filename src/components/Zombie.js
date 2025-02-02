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
        this.ATTACK_RANGE = 6;
        this.ATTACK_DAMAGE = 15; // Increased damage
        this.ATTACK_COOLDOWN = 0.6; // Faster attacks
        this.MOVE_SPEED = 12; // Doubled movement speed
        this.PUSH_DISTANCE = 4;
        this.PUSH_STRENGTH = 15;
        this.FRICTION = 0.92;
        this.LUNGE_DISTANCE = 4; // Longer lunge distance
        this.SPRINT_THRESHOLD = 15; // Distance at which zombie starts sprinting
        this.SPRINT_MULTIPLIER = 1.5; // Speed boost when sprinting
        
        this.createZombie();
        
        position.y = 2.5;
        this.position.copy(position);
        this.originalPosition = position.y;
        this.velocity = new THREE.Vector3();
        this.isSprinting = false;
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
        
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
        const distance = toPlayer.length();
        const direction = toPlayer.normalize();

        // Determine if zombie should sprint
        this.isSprinting = distance < this.SPRINT_THRESHOLD;
        const currentSpeed = this.isSprinting ? 
            this.MOVE_SPEED * this.SPRINT_MULTIPLIER : 
            this.MOVE_SPEED;

        // Handle movement with more aggressive behavior
        if (distance > this.PUSH_DISTANCE && !this.isAttacking) {
            const moveForce = direction.multiplyScalar(currentSpeed * deltaTime);
            this.velocity.add(moveForce);

            // Add random staggering movement
            const staggerAmount = 0.3;
            this.velocity.x += (Math.random() - 0.5) * staggerAmount;
            this.velocity.z += (Math.random() - 0.5) * staggerAmount;
        }

        // More aggressive attack behavior
        if (distance <= this.ATTACK_RANGE && this.attackCooldown <= 0) {
            this.attack(playerPosition);
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Apply friction
        this.velocity.multiplyScalar(this.FRICTION);

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Look at player but maintain upright position
        const targetPosition = new THREE.Vector3(
            playerPosition.x,
            this.position.y,
            playerPosition.z
        );
        this.lookAt(targetPosition);

        // Apply forward tilt to body only when sprinting
        if (this.isSprinting && !this.isAttacking) {
            this.body.rotation.x = -0.3;
            this.head.rotation.x = 0.3; // Compensate head tilt
        } else {
            this.body.rotation.x = 0;
            this.head.rotation.x = 0;
        }
        
        // Animate based on state and speed
        this.animate(deltaTime, distance <= this.ATTACK_RANGE);
    }

    attack(playerPosition) {
        this.isAttacking = true;
        this.attackCooldown = this.ATTACK_COOLDOWN;
        
        const attackDuration = 0.5;
        const startTime = Date.now();
        const startPosition = this.position.clone();
        const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPosition, this.position)
            .normalize();
        
        const animateAttack = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / attackDuration, 1);
            
            // Lunge forward animation with extended reach
            if (progress < 0.5) {
                // Lunge forward
                const lungeProgress = Math.sin(progress * Math.PI) * this.LUNGE_DISTANCE;
                this.position.copy(startPosition).add(directionToPlayer.multiplyScalar(lungeProgress));
                
                // Raise arms for attack
                if (this.leftArm && this.rightArm) {
                    const armAngle = Math.PI * 0.5 * progress;
                    this.leftArm.rotation.x = -Math.PI/2 + armAngle;
                    this.rightArm.rotation.x = -Math.PI/2 + armAngle;
                }

                // Check for hit at apex of lunge
                if (progress > 0.2 && progress < 0.3) {
                    const player = this.scene.userData.player;
                    if (player) {
                        const distanceToPlayer = this.position.distanceTo(playerPosition);
                        if (distanceToPlayer <= this.ATTACK_RANGE) {
                            player.takeDamage(this.ATTACK_DAMAGE);
                        }
                    }
                }
            } else {
                // Return to starting position
                const returnProgress = 1 - ((progress - 0.5) * 2);
                const lungeDistance = Math.sin(returnProgress * Math.PI) * this.LUNGE_DISTANCE;
                this.position.copy(startPosition).add(directionToPlayer.multiplyScalar(lungeDistance));
                
                // Lower arms
                if (this.leftArm && this.rightArm) {
                    const armAngle = Math.PI * 0.5 * returnProgress;
                    this.leftArm.rotation.x = -Math.PI/2 + armAngle;
                    this.rightArm.rotation.x = -Math.PI/2 + armAngle;
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateAttack);
            } else {
                this.position.copy(startPosition);
                this.isAttacking = false;
            }
        };
        
        animateAttack();
    }

    animate(deltaTime, isInAttackRange) {
        const time = Date.now() * 0.002;
        const walkSpeed = this.isSprinting ? 8 : 4;
        
        if (!this.isAttacking) {
            // Head movement
            const headIntensity = this.isSprinting ? 0.2 : 0.1;
            this.head.rotation.z = Math.cos(time * 0.8) * headIntensity;
            
            if (!isInAttackRange) {
                // Arm swinging
                const armSwing = this.isSprinting ? 0.8 : 0.5;
                this.leftArm.rotation.x = Math.sin(time * walkSpeed) * armSwing;
                this.rightArm.rotation.x = Math.sin(time * walkSpeed + Math.PI) * armSwing;
                this.leftArm.rotation.z = Math.PI * 0.15;
                this.rightArm.rotation.z = -Math.PI * 0.15;
                
                // Leg movement
                const legSwing = this.isSprinting ? 0.8 : 0.5;
                this.leftLeg.rotation.x = Math.sin(time * walkSpeed) * legSwing;
                this.rightLeg.rotation.x = Math.sin(time * walkSpeed + Math.PI) * legSwing;
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