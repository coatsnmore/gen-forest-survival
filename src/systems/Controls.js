import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { GAME_SETTINGS } from '../utils/constants';

export class Controls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new PointerLockControls(camera, domElement);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Movement states
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isJumping = false;
        this.playerVelocityY = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        document.addEventListener('click', this.onClick.bind(this));

        this.controls.addEventListener('lock', () => {
            document.getElementById('instructions').classList.add('hidden');
        });

        this.controls.addEventListener('unlock', () => {
            document.getElementById('instructions').classList.remove('hidden');
        });
    }

    onClick(event) {
        if (!this.controls.isLocked) {
            this.controls.lock();
        }
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (!this.isJumping) {
                    this.isJumping = true;
                    this.playerVelocityY = 5;
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    update(deltaTime) {
        if (this.controls.isLocked) {
            // Update velocity with friction
            this.velocity.x -= this.velocity.x * 10.0 * deltaTime;
            this.velocity.z -= this.velocity.z * 10.0 * deltaTime;

            // Update jumping
            if (this.isJumping) {
                this.playerVelocityY += GAME_SETTINGS.GRAVITY * deltaTime;
                this.camera.position.y += this.playerVelocityY * deltaTime;

                if (this.camera.position.y <= GAME_SETTINGS.PLAYER_HEIGHT) {
                    this.isJumping = false;
                    this.playerVelocityY = 0;
                    this.camera.position.y = GAME_SETTINGS.PLAYER_HEIGHT;
                }
            }

            // Calculate movement direction
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            // Apply movement
            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * 100.0 * deltaTime;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * 100.0 * deltaTime;
            }

            // Update position
            this.controls.moveRight(-this.velocity.x * deltaTime);
            this.controls.moveForward(-this.velocity.z * deltaTime);
        }
    }

    lock() {
        this.controls.lock();
    }

    unlock() {
        this.controls.unlock();
    }

    isLocked() {
        return this.controls.isLocked;
    }
} 