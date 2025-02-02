import * as THREE from 'three';
import { GAME_SETTINGS } from '../utils/constants';

export class Player {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.isAttacking = false;
        this.health = 100;
        this.maxHealth = 100;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 1; // Seconds of invulnerability after being hit
        this.COLLISION_RADIUS = 2; // Radius of player's collision cylinder
        this.createArm();
        this.createHealthBar();
        this.createCollisionBoundary();
        
        // Make sure camera is at proper height
        this.camera.position.y = GAME_SETTINGS.PLAYER_HEIGHT;
        
        // Add camera to scene
        this.scene.add(this.camera);

        this.isHealing = false;
        this.healingAmount = 0;
        this.healingSpeed = 10; // Health points per second
        
        // Create survival timer
        this.createSurvivalTimer();
        this.startTime = Date.now();
        this.endTime = null;
        this.isDead = false;
        this.timerUpdateInterval = null; // Add this line to track the timer interval
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
        
        // Add shadows to all arm and sword parts
        this.armGroup.traverse(object => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        
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
            
            // Swing arc - changed to swing downward
            const startAngle = Math.PI / 8;  // Starting position
            const swingAngle = Math.sin(progress * Math.PI) * Math.PI / 2;  // Increased swing range
            this.armGroup.rotation.x = startAngle - swingAngle;  // Subtract to swing down
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.armGroup.rotation.x = startAngle;  // Return to starting position
                this.isAttacking = false;
            }
        };
        
        animate();
        return true;
    }

    update(deltaTime) {
        // Update collision boundary position to match player
        this.collisionBoundary.position.x = this.camera.position.x;
        this.collisionBoundary.position.z = this.camera.position.z;

        // Handle healing animation
        if (this.isHealing && this.healingAmount > 0) {
            const healThisFrame = this.healingSpeed * deltaTime;
            const actualHeal = Math.min(healThisFrame, this.healingAmount);
            
            this.health = Math.min(this.maxHealth, this.health + actualHeal);
            this.healingAmount -= actualHeal;
            
            // Update health bar
            this.healthBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
            
            if (this.healingAmount <= 0) {
                this.isHealing = false;
            }
        }

        // Check for zombie collisions
        if (!this.isInvulnerable) {
            const zombies = [];
            this.scene.traverse((object) => {
                if (object.userData && object.userData.isZombie) {
                    zombies.push(object);
                }
            });

            zombies.forEach(zombie => {
                const distance = zombie.position.distanceTo(this.camera.position);
                if (distance < this.COLLISION_RADIUS + 1) { // +1 for zombie's size
                    this.takeDamage(10); // Take damage on collision
                    
                    // Push player back from zombie
                    const pushDirection = new THREE.Vector3()
                        .subVectors(this.camera.position, zombie.position)
                        .normalize()
                        .multiplyScalar(2); // Push distance
                    
                    this.camera.position.x += pushDirection.x;
                    this.camera.position.z += pushDirection.z;
                }
            });
        }

        // Update timer only if alive and timer exists
        if (!this.isDead && this.timerDisplay) {
            const currentTime = Date.now();
            const survivalTime = currentTime - this.startTime;
            this.timerDisplay.textContent = `Survival Time: ${this.formatTime(survivalTime)}`;
        }
    }

    createHealthBar() {
        // Create HUD elements
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.position = 'fixed';
        healthBarContainer.style.bottom = '20px';
        healthBarContainer.style.left = '20px';
        healthBarContainer.style.width = '200px';
        healthBarContainer.style.height = '20px';
        healthBarContainer.style.backgroundColor = '#333';
        healthBarContainer.style.border = '2px solid #666';

        this.healthBarFill = document.createElement('div');
        this.healthBarFill.style.width = '100%';
        this.healthBarFill.style.height = '100%';
        this.healthBarFill.style.backgroundColor = '#ff0000';
        this.healthBarFill.style.transition = 'width 0.2s';

        healthBarContainer.appendChild(this.healthBarFill);
        document.body.appendChild(healthBarContainer);
    }

    takeDamage(amount) {
        if (this.isInvulnerable) return;

        this.health = Math.max(0, this.health - amount);
        this.healthBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;

        // Visual feedback
        this.scene.traverse((object) => {
            if (object.material && object.material.color) {
                object.material._originalColor = object.material.color.clone();
                object.material.color.setHex(0xff0000);
            }
        });

        setTimeout(() => {
            this.scene.traverse((object) => {
                if (object.material && object.material._originalColor) {
                    object.material.color.copy(object.material._originalColor);
                }
            });
        }, 200);

        // Invulnerability period
        this.isInvulnerable = true;
        setTimeout(() => {
            this.isInvulnerable = false;
        }, this.invulnerabilityTime * 1000);

        // Check for death
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.endTime = Date.now();
        const survivalTime = this.endTime - this.startTime;
        const formattedTime = this.formatTime(survivalTime);

        // Clear timer interval and remove display
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
            this.timerUpdateInterval = null;
        }

        // Remove ALL existing timers
        document.querySelectorAll('#survival-timer').forEach(timer => {
            timer.remove();
        });

        // Force remove the timer reference
        this.timerDisplay = null;

        // Create game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over-screen';  // Add ID for easier cleanup
        gameOverScreen.style.position = 'fixed';
        gameOverScreen.style.top = '0';
        gameOverScreen.style.left = '0';
        gameOverScreen.style.width = '100%';
        gameOverScreen.style.height = '100%';
        gameOverScreen.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        gameOverScreen.style.display = 'flex';
        gameOverScreen.style.flexDirection = 'column';
        gameOverScreen.style.justifyContent = 'center';
        gameOverScreen.style.alignItems = 'center';
        gameOverScreen.style.color = 'white';
        gameOverScreen.style.fontFamily = 'Arial, sans-serif';
        gameOverScreen.style.zIndex = '1000';

        const gameOverText = document.createElement('div');
        gameOverText.textContent = 'GAME OVER';
        gameOverText.style.fontSize = '48px';
        gameOverText.style.marginBottom = '20px';
        gameOverScreen.appendChild(gameOverText);

        const survivalTimeText = document.createElement('div');
        survivalTimeText.textContent = `You survived for ${formattedTime}`;
        survivalTimeText.style.fontSize = '32px';
        survivalTimeText.style.marginBottom = '40px';
        gameOverScreen.appendChild(survivalTimeText);

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Click to Restart';
        restartButton.style.fontSize = '24px';
        restartButton.style.padding = '10px 20px';
        restartButton.style.cursor = 'pointer';
        restartButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        restartButton.style.border = '2px solid white';
        restartButton.style.color = 'white';
        restartButton.style.borderRadius = '5px';
        gameOverScreen.appendChild(restartButton);

        document.body.appendChild(gameOverScreen);

        // Unlock pointer on death
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Handle restart
        const handleRestart = () => {
            // Remove any existing game over screens
            document.querySelectorAll('#game-over-screen').forEach(screen => {
                screen.remove();
            });
            
            // Reset player state
            this.health = this.maxHealth;
            this.healthBarFill.style.width = '100%';
            this.isInvulnerable = false;
            
            // Reset position
            this.camera.position.set(0, GAME_SETTINGS.PLAYER_HEIGHT, 0);
            
            // Reset death state and timer
            this.isDead = false;
            this.endTime = null;
            this.startTime = Date.now();
            
            // Create new timer
            this.createSurvivalTimer();
            
            // Reset all zombies
            const gameManager = this.scene.userData.gameManager;
            if (gameManager) {
                // Remove all existing zombies
                gameManager.zombies.forEach(zombie => {
                    this.scene.remove(zombie);
                });
                gameManager.zombies = [];
                gameManager.dyingZombies.clear();
                
                // Create new zombies
                gameManager.createZombies();
            }

            // Request pointer lock again
            document.body.requestPointerLock();
        };

        // Add click event to button only
        restartButton.addEventListener('click', handleRestart, { once: true });
    }

    createCollisionBoundary() {
        // Create invisible collision cylinder
        const geometry = new THREE.CylinderGeometry(this.COLLISION_RADIUS, this.COLLISION_RADIUS, GAME_SETTINGS.PLAYER_HEIGHT * 2, 8);
        const material = new THREE.MeshBasicMaterial({
            visible: false,
            transparent: true,
            opacity: 0
        });
        this.collisionBoundary = new THREE.Mesh(geometry, material);
        this.collisionBoundary.position.y = GAME_SETTINGS.PLAYER_HEIGHT;
        this.collisionBoundary.castShadow = true; // Add shadow casting
        this.scene.add(this.collisionBoundary);
    }

    heal(amount) {
        if (this.health >= this.maxHealth) return;

        // Start healing animation
        this.isHealing = true;
        this.healingAmount = amount;
        
        // Visual feedback
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 0.5s';
        document.body.appendChild(flash);
        
        // Add healing sound
        const healSound = new Audio('/path/to/heal-sound.mp3'); // TODO: Add actual sound file
        healSound.volume = 0.3;
        healSound.play().catch(() => {}); // Ignore errors if sound fails to play
        
        // Fade out and remove flash
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => document.body.removeChild(flash), 500);
        }, 100);
    }

    createSurvivalTimer() {
        // Clear any existing timer interval
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
            this.timerUpdateInterval = null;
        }

        // Remove ALL existing timers
        document.querySelectorAll('#survival-timer').forEach(timer => {
            timer.remove();
        });

        this.timerDisplay = document.createElement('div');
        this.timerDisplay.id = 'survival-timer';
        this.timerDisplay.style.position = 'fixed';
        this.timerDisplay.style.top = '20px';
        this.timerDisplay.style.left = '50%';
        this.timerDisplay.style.transform = 'translateX(-50%)';
        this.timerDisplay.style.color = 'white';
        this.timerDisplay.style.fontSize = '24px';
        this.timerDisplay.style.fontFamily = 'Arial, sans-serif';
        this.timerDisplay.style.textShadow = '2px 2px 2px black';
        this.timerDisplay.style.zIndex = '100';
        document.body.appendChild(this.timerDisplay);
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
} 