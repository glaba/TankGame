var myPlayerNumber;
var gameRunning = false;

var tanks = [];

var pickups;

// Object containing
// - spawnLocations (array of arrays)
// - width, height
// - 2D array walls of size WIDTHxHEIGHT with each element containing booleans down, right, up, left (only down and right are sent from the server)
// - flagSpawnLocations
// - flagLocations - [{x, y, state}] - state can be either "Safe", "Held", or "Dropped"
var map;
var tick;
var orders = {};

var previousTime = Date.now();

var simulateTick = function() {
	// Process commands
	for (i in orders[tick]) {
		var curPlayerNumber = orders[tick][i].playerNumber;
		var curKeys = orders[tick][i].keys;
		var curTank = tanks[curPlayerNumber];

		if (curTank.deadAt == Number.MAX_VALUE) {
			var hasLateralMotion = false;
			for (j in curKeys) {
				if (curKeys[j] == "ArrowUp" && !hasLateralMotion) {
					hasLateralMotion = true;
					if (curTank.speed < TANK_SPEED) {
						curTank.speed = Math.max(Math.min(curTank.speed + TANK_ACCELERATION, TANK_SPEED), -TANK_SPEED);
					}
					moveTank(curTank, curTank.speed);
				} else if (curKeys[j] == "ArrowDown" && !hasLateralMotion) {
					hasLateralMotion = true;
					if (curTank.speed > -TANK_SPEED) {
						curTank.speed = Math.min(Math.max(curTank.speed - TANK_ACCELERATION, -TANK_SPEED), TANK_SPEED);
					}
					moveTank(curTank, curTank.speed);
				} else if (curKeys[j] == "ArrowRight") {
					rotateTank(curTank, TANK_TURN_SPEED);
				} else if (curKeys[j] == "ArrowLeft") {
					rotateTank(curTank, -TANK_TURN_SPEED);
				} else if (curKeys[j] == " ") {
					if (curTank.heldPickup) {
						curTank.powerup = Powerups[curTank.heldPickup].create(curTank);
						curTank.heldPickup = null;
					} else if (curTank.powerup.type == "None" && (curTank.bulletX < 0 || curTank.bulletY < 0)) {
						curTank.bulletX = curTank.x + TANK_SIZE / 2 * 1.2 * DMath.cos(curTank.direction);
						curTank.bulletY = curTank.y + TANK_SIZE / 2 * 1.2 * DMath.sin(curTank.direction);
						curTank.bulletXComp = DMath.cos(curTank.direction);
						curTank.bulletYComp = DMath.sin(curTank.direction);
					}
				}
			}
			if (!hasLateralMotion) {
				curTank.speed = 0;
			}
		}
	}

	// Simulate bullets
	for (i in tanks) {
		if (tanks[i].bulletX >= 0 && tanks[i].bulletY >= 0) {
			if (tanks[i].bulletRemainingLifetime <= 0) {
				tanks[i].bulletRemainingLifetime = tanks[i].bulletDefaultLifetime;
				tanks[i].bulletX = -1;
				tanks[i].bulletY = -1;
			} else {
				moveBullet(tanks[i]);
				tanks[i].bulletRemainingLifetime--;
			}
		}
	}

	// Check bullet collisions with tanks
	for (i in tanks) {
		if (tanks[i].bulletX >= 0 && tanks[i].bulletY >= 0) {
			for (j in tanks) {
				if (tanks[j].deadAt == Number.MAX_VALUE) {
					var p1x = tanks[j].x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(tanks[j].direction + Math.PI / 4);
					var p1y = tanks[j].y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(tanks[j].direction + Math.PI / 4);
					var p2x = tanks[j].x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(tanks[j].direction + 3 * Math.PI / 4);
					var p2y = tanks[j].y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(tanks[j].direction + 3 * Math.PI / 4);
					var p4x = tanks[j].x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(tanks[j].direction - Math.PI / 4);
					var p4y = tanks[j].y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(tanks[j].direction - Math.PI / 4);
					var p21 = {x: p2x - p1x, y: p2y - p1y};
					var p41 = {x: p4x - p1x, y: p4y - p1y};
					var pBullet1 = {x: tanks[i].bulletX - p1x, y: tanks[i].bulletY - p1y};
					if (pBullet1.x * p21.x + pBullet1.y * p21.y >= 0 &&
						pBullet1.x * p21.x + pBullet1.y * p21.y <= p21.x * p21.x + p21.y * p21.y &&
						pBullet1.x * p41.x + pBullet1.y * p41.y >= 0 &&
						pBullet1.x * p41.x + pBullet1.y * p41.y <= p41.x * p41.x + p41.y * p41.y) {

						// Bullet hit the tank
						tanks[j].heldPickup = null;
						tanks[j].powerup = {type: "None"};
						tanks[j].deadAt = tick;
						tanks[i].bulletRemainingLifetime = tanks[i].bulletDefaultLifetime;
						tanks[i].bulletX = -1;
						tanks[i].bulletY = -1;
					}
				}
			}
		}
	}

	// Check powerup collisions with tanks
	for (i in tanks) {
		if (tanks[i].powerup.type != "None") {
			for (j in tanks) {
				if (tanks[j].deadAt == Number.MAX_VALUE && tanks[i].powerup.killsTank(tanks[i].powerup, tanks[j])) {
					tanks[j].deadAt = tick;
					tanks[i].powerup = {type: "None"};
					break;
				}
			}
		}
	}

	// Check tank respawns
	for (i in tanks) {
		if (tick > tanks[i].deadAt && (tick - tanks[i].deadAt) > 50) {
			tanks[i].deadAt = Number.MAX_VALUE;

			// Respawn tank
			var spawnLocationIndex = Math.floor(DMath.random() * map.spawnLocations[tanks[i].team].length);
			var location = map.spawnLocations[tanks[i].team][spawnLocationIndex];

			tanks[i].x = location.x;
			tanks[i].y = location.y;
			tanks[i].direction = location.direction;
			tanks[i].speed = 0;
			tanks[i].rx = location.x;
			tanks[i].ry = location.y;
			tanks[i].rDirection = location.direction;
			tanks[i].rSpeed = 0;
			tanks[i].powerup = {type: "None"};
			tanks[i].heldPickup = null;

			if (tanks[i].hasFlag) {
				var index = (Number(tanks[i].team) + 1) % 2;
				map.flagLocations[index].state = "Dropped";
				tanks[i].hasFlag = false;
			}
		}
	}

	// Check tank intersections with flags
	for (i in tanks) {
		for (j in map.flagLocations) {
			if (Math.sqrt(Math.pow(tanks[i].x - map.flagLocations[j].x, 2) + Math.pow(tanks[i].y - map.flagLocations[j].y, 2)) < (FLAG_SIZE / 2 + TANK_SIZE / 2)) {
				// Tank intersects flag
				if (tanks[i].hasFlag && j == tanks[i].team && map.flagLocations[j].state == "Safe") {
					// Score a point
					var newScores = app.scores.slice();
					newScores[j]++;
					app.scores = newScores;

					var enemyTeamIndex = (Number(j) + 1) % 2;
					tanks[i].hasFlag = false;
					map.flagLocations[enemyTeamIndex].state = "Safe";
					map.flagLocations[enemyTeamIndex].x = map.flagSpawnLocations[enemyTeamIndex].x;
					map.flagLocations[enemyTeamIndex].y = map.flagSpawnLocations[enemyTeamIndex].y;
				}
				if (map.flagLocations[j].state == "Dropped" && tanks[i].team == j && (map.flagLocations[j].x != map.flagSpawnLocations[j].x || map.flagLocations[j].y != map.flagSpawnLocations[j].y)) {
					map.flagLocations[j].x = map.flagSpawnLocations[j].x;
					map.flagLocations[j].y = map.flagSpawnLocations[j].y;
					map.flagLocations[j].state = "Safe";
					map.flagLocations[j].owner.hasFlag = false;
					map.flagLocations[j].owner = null; 
				} 
				if ((map.flagLocations[j].state == "Dropped" || map.flagLocations[j].state == "Safe") && tanks[i].team != j) {
					map.flagLocations[j].state = "Held";
					map.flagLocations[j].owner = tanks[i];
					tanks[i].hasFlag = true;
				}
			}
		}
	}

	// Update flags
	for (i in map.flagLocations) {
		if (map.flagLocations[i].state == "Held") {
			map.flagLocations[i].x = map.flagLocations[i].owner.x;
			map.flagLocations[i].y = map.flagLocations[i].owner.y;
		}
	}

	// Update powerups
	for (i in tanks) {
		if (tanks[i].powerup.type != "None") {
			tanks[i].powerup.update(tanks[i].powerup);
			if (tanks[i].powerup.timeElapsed >= tanks[i].powerup.totalTime) {
				tanks[i].powerup = {type: "None"};
			}
		}
	}

	// Create new pickups
	var xList = [];
	var yList = [];
	for (var x = 0; x < map.width; x++) {
		xList.push(x);
	}
	for (var y = 0; y < map.height; y++) {
		yList.push(y);
	}
	xList.sort(function(a, b) {return DMath.random() > 0.5;});
	yList.sort(function(a, b) {return DMath.random() > 0.5;});
	for (x in xList) {
		for (y in yList) {
			for (i in PICKUP_SPAWN_CHANCES) {
				if (DMath.random() < PICKUP_SPAWN_CHANCES[i]) {
					pickups[xList[x]][yList[y]] = {type: i, angle: Math.random() * 2 * Math.PI};
					break;
				}
			}
		}
	}

	// Check pickup intersections
	for (i in tanks) {
		var pickupType = pickups[Math.floor(tanks[i].x)][Math.floor(tanks[i].y)].type;
		if (pickupType == "None") {
			continue;
		}

		if (Math.sqrt(Math.pow(tanks[i].x % 1 - 0.5, 2) + Math.pow(tanks[i].y % 1 - 0.5, 2)) < (PICKUP_RADIUS + TANK_SIZE / 2) && tanks[i].powerup.type == "None" && !tanks[i].heldPickup) {
			tanks[i].heldPickup = pickupType;
			pickups[Math.floor(tanks[i].x)][Math.floor(tanks[i].y)].type = "None";
		}
	}

	tick++;
};

var tankIntersectsMap = function(_x, _y, direction) {
	for (var x = -1; x <= 1; x++) {
		for (var y = -1; y <= 1; y++) {
			var curTileX = Math.floor(_x) + x;
			var curTileY = Math.floor(_y) + y;

			if (curTileX >= 0 && curTileX < map.width && curTileY >= 0 && curTileY < map.height) {
				var downWallSegment = {start: {x: curTileX, y: curTileY + 1}, end: {x: curTileX + 1, y: curTileY + 1}};
				var rightWallSegment = {start: {x: curTileX + 1, y: curTileY}, end: {x: curTileX + 1, y: curTileY + 1}};
				var upWallSegment = {start: {x: curTileX, y: curTileY}, end: {x: curTileX + 1, y: curTileY}};
				var leftWallSegment = {start: {x: curTileX, y: curTileY}, end: {x: curTileX, y: curTileY + 1}};

				var curDirection = direction - Math.PI / 4;
				var startingTankCorner = {x: _x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(curDirection), y: _y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(curDirection)};
				var previousTankCorner = startingTankCorner;
				
				for (var i = 0; i < 4; i++) {
					curDirection += Math.PI / 2;
					var currentTankCorner = {x: _x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(curDirection), y: _y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(curDirection)};
					var intersectsDown = DMath.segmentIntersectsSegment(previousTankCorner, currentTankCorner, downWallSegment.start, downWallSegment.end);
					var intersectsRight = DMath.segmentIntersectsSegment(previousTankCorner, currentTankCorner, rightWallSegment.start, rightWallSegment.end);
					var intersectsUp = DMath.segmentIntersectsSegment(previousTankCorner, currentTankCorner, upWallSegment.start, upWallSegment.end);
					var intersectsLeft = DMath.segmentIntersectsSegment(previousTankCorner, currentTankCorner, leftWallSegment.start, leftWallSegment.end);

					if ((intersectsDown && map.walls[curTileX][curTileY].down) || (intersectsRight && map.walls[curTileX][curTileY].right) ||
						(intersectsUp && map.walls[curTileX][curTileY].up) || (intersectsLeft && map.walls[curTileX][curTileY].left)) {
						return true;
					}
				}
			}
		}
	}
	return false;
};

var moveTank = function(tank, distance, prediction) {
	// The tank is a square centered at its location with size TANK_SIZE
	var newX = (prediction ? tank.rx : tank.x) + distance * DMath.cos((prediction ? tank.rDirection : tank.direction));
	var newY = (prediction ? tank.ry : tank.y) + distance * DMath.sin((prediction ? tank.rDirection : tank.direction));
	var direction = (prediction ? tank.rDirection : tank.direction);

	if (!tankIntersectsMap(newX, newY, direction)) {
		// Do nothing
	} else {
		var counter = 1000;
		while (tankIntersectsMap(newX, newY, direction) && counter > 0) {
			counter--;
			newX -= DMath.sign(distance) * 0.001 * DMath.cos((prediction ? tank.rDirection : tank.direction));
			newY -= DMath.sign(distance) * 0.001 * DMath.sin((prediction ? tank.rDirection : tank.direction));
		}
	}
	if (!prediction) {
		if (curDirectionVector.x * (newX - tank.rx) + curDirectionVector.y * (newY - tank.ry) > 0) {
			//tank.rx = (newX) / 1;
			//tank.ry = (newY) / 1;
		}
		tank.x = newX;
		tank.y = newY;
	} else {
		tank.rx = newX;
		tank.ry = newY;
	}
};

var rotateTank = function(tank, rads, prediction) {
	// The tank is a square centered at its location with size TANK_SIZE
	var newDirection = (prediction ? tank.rDirection : tank.direction) + rads;
	var location = (prediction ? {x: tank.rx, y: tank.ry} : {x: tank.x, y: tank.y});

	if (!tankIntersectsMap(location.x, location.y, newDirection)) {
		// Do nothing
	} else {
		while (tankIntersectsMap(location.x, location.y, newDirection)) {
			newDirection -= DMath.sign(rads) * 0.001;
		}
	}
	if (!prediction) {
		if (DMath.sign(newDirection - tank.rDirection) == DMath.sign(curRotationDirection)) {
			//tank.rDirection = (newDirection) / 1;
		}
		tank.direction = newDirection;
	} else {
		tank.rDirection = newDirection;
	}
};

var moveBullet = function(ownerTank) {
	var newX = ownerTank.bulletX + BULLET_SPEED * ownerTank.bulletXComp;
	var newY = ownerTank.bulletY + BULLET_SPEED * ownerTank.bulletYComp;
	var oldBulletPosition = {x: ownerTank.bulletX, y: ownerTank.bulletY};
	var endPoint = {x: newX, y: newY};

	var curTileX = Math.floor(ownerTank.bulletX);
	var curTileY = Math.floor(ownerTank.bulletY);

	if (curTileX < 0 || curTileY < 0 || curTileX >= map.width || curTileY >= map.height) {
		return;
	}
	
	if ((Math.floor(newY) > curTileY && map.walls[curTileX][curTileY].down) || (Math.floor(newY) < curTileY && map.walls[curTileX][curTileY].up)) {
		ownerTank.bulletYComp *= -1;
	}
	if ((Math.floor(newX) > curTileX && map.walls[curTileX][curTileY].right) || (Math.floor(newX) < curTileX && map.walls[curTileX][curTileY].left)) {
		ownerTank.bulletXComp *= -1;
	}

	ownerTank.bulletX += BULLET_SPEED * ownerTank.bulletXComp;
	ownerTank.bulletY += BULLET_SPEED * ownerTank.bulletYComp;
};