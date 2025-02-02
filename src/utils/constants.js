import * as THREE from 'three';

export const GAME_SETTINGS = {
    PLAYER_HEIGHT: 5,
    GRAVITY: -9.8,
    DAY_DURATION: 600, // 10 minutes for a full day/night cycle
    DAY_START: 0.25, // Start at 1/4 through the cycle (morning)
    ATTACK_RANGE: 6,
    DAMAGE: {
        SWORD: 34,
        TREE: 50
    }
};

export const COLORS = {
    SKY: {
        DAY: new THREE.Color(0.1, 0.3, 0.85),
        NIGHT: new THREE.Color(0.0, 0.0, 0.1),
        SUNSET: new THREE.Color(0.8, 0.3, 0.1),
        HORIZON: new THREE.Color(0.7, 0.7, 0.9)
    },
    TREE: {
        TRUNK: 0x4a2805,
        LEAVES: [0x0d5302, 0x0a4502, 0x0c4f02]
    }
}; 