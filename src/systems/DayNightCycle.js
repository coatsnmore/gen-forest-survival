import * as THREE from 'three';
import { COLORS, GAME_SETTINGS } from '../utils/constants';

export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.time = GAME_SETTINGS.DAY_DURATION * GAME_SETTINGS.DAY_START;
        this.setupSky();
        this.setupSun();
        
        this.update(0);
    }

    setupSky() {
        this.sky = new THREE.Mesh(
            new THREE.SphereGeometry(500, 32, 32),
            new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                vertexColors: true
            })
        );
        this.updateSkyColors();
        this.scene.add(this.sky);
    }

    setupSun() {
        this.sun = new THREE.DirectionalLight(0xffffcc, 1);
        this.sun.castShadow = true;
        this.scene.add(this.sun);
    }

    updateSkyColors() {
        const skyGeo = this.sky.geometry;
        const skyColors = [];
        for (let i = 0; i < skyGeo.attributes.position.count; i++) {
            const y = skyGeo.attributes.position.getY(i);
            if (y > 0) {
                skyColors.push(
                    COLORS.SKY.DAY.r,
                    COLORS.SKY.DAY.g,
                    COLORS.SKY.DAY.b
                );
            } else {
                skyColors.push(
                    COLORS.SKY.HORIZON.r,
                    COLORS.SKY.HORIZON.g,
                    COLORS.SKY.HORIZON.b
                );
            }
        }
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
    }

    update(deltaTime) {
        this.time += deltaTime;
        const dayProgress = (this.time % GAME_SETTINGS.DAY_DURATION) / GAME_SETTINGS.DAY_DURATION;
        const sunAngle = dayProgress * Math.PI * 2;
        
        // Update sun position
        this.sun.position.x = Math.cos(sunAngle) * 100;
        this.sun.position.y = Math.sin(sunAngle) * 100;
        this.sun.position.z = 0;
        
        // Update sun intensity
        const sunHeight = Math.max(0, Math.sin(sunAngle));
        this.sun.intensity = sunHeight * 1.5;
        
        this.updateSkyColorsForTime(sunHeight);
    }

    updateSkyColorsForTime(sunHeight) {
        const skyGeo = this.sky.geometry;
        const skyColors = [];
        
        for (let i = 0; i < skyGeo.attributes.position.count; i++) {
            const y = skyGeo.attributes.position.getY(i);
            if (y > 0) {
                let finalColor;
                if (sunHeight < 0.2) {
                    finalColor = COLORS.SKY.NIGHT;
                } else if (sunHeight < 0.4) {
                    const t = (sunHeight - 0.2) / 0.2;
                    finalColor = COLORS.SKY.NIGHT.clone().lerp(COLORS.SKY.SUNSET, t);
                } else if (sunHeight < 0.6) {
                    const t = (sunHeight - 0.4) / 0.2;
                    finalColor = COLORS.SKY.SUNSET.clone().lerp(COLORS.SKY.DAY, t);
                } else {
                    finalColor = COLORS.SKY.DAY;
                }
                skyColors.push(finalColor.r, finalColor.g, finalColor.b);
            } else {
                skyColors.push(
                    COLORS.SKY.HORIZON.r,
                    COLORS.SKY.HORIZON.g,
                    COLORS.SKY.HORIZON.b
                );
            }
        }
        
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
        skyGeo.attributes.color.needsUpdate = true;
    }
} 