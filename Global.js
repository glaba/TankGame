var TICK_TIME = 30;

// Map units / tick
var BULLET_SPEED = 0.00285 * TICK_TIME;
var MISSILE_SPEED = 0.00263 * TICK_TIME;

var MISSILE_TURN_SPEED = 0.0136 * TICK_TIME;

var TANK_SPEED = 0.0025 * TICK_TIME;
var TANK_ACCELERATION = 0.001 * TICK_TIME;
var TANK_TURN_SPEED = 0.00628 * TICK_TIME;

var TANK_SIZE = 0.4;

var PIXELS_PER_UNIT = 140;

var TEAM_COLORS = ["#FF0000", "#0000FF"];

var FLAG_SIZE = 0.2;

var PICKUP_RADIUS = 0.2;

var MISSILE_SIZE = 0.15;

// Chance that a powerup of the given type will spawn in any given tile within 1 tick
var PICKUP_SPAWN_CHANCES = {missile: 0.001 / (1000 / TICK_TIME)};