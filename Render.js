var canvas = document.getElementById("canvas");
var cameraCenterOnMapX;
var cameraCenterOnMapY;

var flagImages = [];
var tankImages = []; // Center is 42, 39
var pickupImages = {};
var powerupImages = {};

var particles = [];

// https://stackoverflow.com/questions/16787880/how-can-we-maker-color-darker-than-given-color-in-jquery
var changeBrightness = function(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    }
    lum = lum || 0;
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i*2,2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00"+c).substr(c.length);
    }
    return rgb;
}

var initGraphics = function() {
	for (var i = 0; i < TEAM_COLORS.length; i++) {
		var curFlag = new Image();
		curFlag.src = "flag" + i + ".png";
		flagImages.push(curFlag);
	}
	for (var i = 0; i < TEAM_COLORS.length; i++) {
		var curTank = new Image();
		curTank.src = "tank" + i + ".png";
		tankImages.push(curTank);
	}
	for (i in Powerups) {
		var curPickup = new Image();
		curPickup.src = i + ".png";
		pickupImages[i] = curPickup;

		var curPowerups = [];
		for (j = 0; j < TEAM_COLORS.length; j++) {
			var curImage = new Image();
			curImage.src = i + j + ".png";
			curPowerups.push(curImage);
		}
		powerupImages[i] = curPowerups;
	}
};

var drawTank = function(tank, context, isMyTank, forceTeam) {
	var team = tank.team;
	if (forceTeam) {
		team = forceTeam;
	}

	var centerOffsetX = (isMyTank ? tank.rx : tank.x) - cameraCenterOnMapX;
	var centerOffsetY = (isMyTank ? tank.ry : tank.y) - cameraCenterOnMapY;

	var centerX = context.canvas.width / 2 + centerOffsetX * PIXELS_PER_UNIT;
	var centerY = context.canvas.height / 2 + centerOffsetY * PIXELS_PER_UNIT;

	context.translate(centerX, centerY);
	context.rotate((isMyTank ? tank.rDirection : tank.direction));
	context.drawImage(tankImages[team], -50 / 94 * PIXELS_PER_UNIT * TANK_SIZE, -39 / 79 * PIXELS_PER_UNIT * TANK_SIZE, 94 / 79 * PIXELS_PER_UNIT * TANK_SIZE, PIXELS_PER_UNIT * TANK_SIZE);
	context.rotate((isMyTank ? -tank.rDirection : -tank.direction));
	context.translate(-centerX, -centerY);
};

var drawBullet = function(tank, context) {
	if (tank.bulletX >= 0 && tank.bulletY >= 0) {
		var centerOffsetX = tank.bulletX - cameraCenterOnMapX;
		var centerOffsetY = tank.bulletY - cameraCenterOnMapY;

		var centerX = context.canvas.width / 2 + centerOffsetX * PIXELS_PER_UNIT;
		var centerY = context.canvas.height / 2 + centerOffsetY * PIXELS_PER_UNIT;

		context.fillStyle = TEAM_COLORS[tank.team];
		context.strokeStyle = "#000000";
		context.beginPath();
		context.arc(centerX, centerY, 0.03 * PIXELS_PER_UNIT, 0, 2 * Math.PI);
		context.closePath();
		context.stroke();
		context.fill();
	}
};

var drawPowerup = function(tank, context, powerup) {
	if (powerup.type == "missile") {
		if (powerup.x >= 0 && powerup.y >= 0) {
			var centerOffsetX = powerup.x - cameraCenterOnMapX;
			var centerOffsetY = powerup.y - cameraCenterOnMapY;

			var centerX = context.canvas.width / 2 + centerOffsetX * PIXELS_PER_UNIT;
			var centerY = context.canvas.height / 2 + centerOffsetY * PIXELS_PER_UNIT;

			context.translate(centerX, centerY);
			context.rotate(powerup.direction);
			context.drawImage(powerupImages[powerup.type][tank.team], -MISSILE_SIZE * PIXELS_PER_UNIT / 2, -MISSILE_SIZE * PIXELS_PER_UNIT / 2, MISSILE_SIZE * PIXELS_PER_UNIT, MISSILE_SIZE * PIXELS_PER_UNIT);
			context.rotate(-powerup.direction);
			context.translate(-centerX, -centerY);

			var startColor = "#555555";
			if (powerup.target) {
				startColor = TEAM_COLORS[powerup.target.team];
			}
			particles.push({x: powerup.x - 0.05 * Math.cos(powerup.direction) + Math.random() * 0.05, y: powerup.y - 0.05 * Math.sin(powerup.direction) + Math.random() * 0.05, timeElapsed: 0, totalTime: 20, startColor: startColor, radius: Math.random() * 0.05});
		}
	}
};

var drawPickup = function(type, location, angle, context) {
	var centerOffsetX = location.x - cameraCenterOnMapX;
	var centerOffsetY = location.y - cameraCenterOnMapY;

	var centerX = context.canvas.width / 2 + centerOffsetX * PIXELS_PER_UNIT;
	var centerY = context.canvas.height / 2 + centerOffsetY * PIXELS_PER_UNIT;

	var squareSize = 2 / Math.sqrt(2) * PICKUP_RADIUS * PIXELS_PER_UNIT;

	context.translate(centerX, centerY);
	context.rotate(angle);
	context.drawImage(pickupImages[type], -squareSize / 2, -squareSize / 2, squareSize, squareSize);
	context.rotate(-angle);
	context.translate(-centerX, -centerY);
};

var drawFlag = function(team, location, angle, context) {
	var curFlag = flagImages[team];
	var size = PIXELS_PER_UNIT * FLAG_SIZE;

	var centerOffsetX = location.x - cameraCenterOnMapX;
	var centerOffsetY = location.y - cameraCenterOnMapY;

	var centerX = context.canvas.width / 2 + centerOffsetX * PIXELS_PER_UNIT;
	var centerY = context.canvas.height / 2 + centerOffsetY * PIXELS_PER_UNIT;

	context.translate(centerX, centerY);
	context.rotate(angle);
	context.drawImage(curFlag, -size / 2, -size / 2, size, size);
	context.rotate(-angle);
	context.translate(-centerX, -centerY);
};

var drawParticle = function(particle, context) {
	var centerOffsetX = particle.x - cameraCenterOnMapX;
	var centerOffsetY = particle.y - cameraCenterOnMapY;

	var centerX = context.canvas.width / 2 + centerOffsetX * PIXELS_PER_UNIT;
	var centerY = context.canvas.height / 2 + centerOffsetY * PIXELS_PER_UNIT;

	context.beginPath();
	context.fillStyle = changeBrightness(particle.startColor, -particle.timeElapsed / particle.totalTime);
	context.arc(centerX, centerY, particle.radius * PIXELS_PER_UNIT, 0, 2 * Math.PI);
	context.closePath();
	context.fill();
};

var render = function() {
	canvas = document.getElementById("canvas");
	canvas.width = 1200;
	canvas.height = 800;

	var context = canvas.getContext("2d");
	context.fillStyle = "#CCCCCC";
	context.fillRect(0, 0, canvas.width, canvas.height);

	cameraCenterOnMapX = tanks[myPlayerNumber].rx;
	cameraCenterOnMapY = tanks[myPlayerNumber].ry;

	// Draw map
	for (var x = 0; x < map.width; x++) {
		for (var y = 0; y < map.width; y++) {
			var curRectX = x - cameraCenterOnMapX;
			var curRectY = y - cameraCenterOnMapY;
			context.fillStyle = "#888888";
			context.fillRect(context.canvas.width / 2 + PIXELS_PER_UNIT * curRectX - 1, context.canvas.height / 2 + PIXELS_PER_UNIT * curRectY - 1, PIXELS_PER_UNIT + 2, PIXELS_PER_UNIT + 2);
		}
	}

	for (var x = 0; x < map.width; x++) {
		for (var y = 0; y < map.height; y++) {
			var startX, startY, endX, endY;
			var drawLine = function(startX, startY, endX, endY) {
				context.strokeStyle = "#000000";
				context.beginPath();
				context.moveTo(context.canvas.width / 2 + PIXELS_PER_UNIT * startX, context.canvas.height / 2 + PIXELS_PER_UNIT * startY);
				context.lineTo(context.canvas.width / 2 + PIXELS_PER_UNIT * endX, context.canvas.height / 2 + PIXELS_PER_UNIT * endY);
				context.lineWidth = 0.03 * PIXELS_PER_UNIT;
				context.stroke();
			}
			if (map.walls[x][y].down) {
				startX = x - cameraCenterOnMapX;
				startY = y + 1 - cameraCenterOnMapY;
				endX = x + 1 - cameraCenterOnMapX;
				endY = y + 1 - cameraCenterOnMapY;
				drawLine(startX, startY, endX, endY);
			}
			if (map.walls[x][y].right) {
				startX = x + 1 - cameraCenterOnMapX;
				startY = y - cameraCenterOnMapY;
				endX = x + 1 - cameraCenterOnMapX;
				endY = y + 1 - cameraCenterOnMapY;
				drawLine(startX, startY, endX, endY);
			}
			if (map.walls[x][y].up) {
				startX = x - cameraCenterOnMapX;
				startY = y - cameraCenterOnMapY;
				endX = x + 1 - cameraCenterOnMapX;
				endY = y - cameraCenterOnMapY;
				drawLine(startX, startY, endX, endY);
			}
			if (map.walls[x][y].left) {
				startX = x - cameraCenterOnMapX;
				startY = y - cameraCenterOnMapY;
				endX = x - cameraCenterOnMapX;
				endY = y + 1 - cameraCenterOnMapY;
				drawLine(startX, startY, endX, endY);
			}

		}
	}

	// Draw pickups
	for (var x = 0; x < map.width; x++) {
		for (var y = 0; y < map.height; y++) {
			if (pickups[x][y].type != "None") {
				drawPickup(pickups[x][y].type, {x: x + 0.5, y: y + 0.5}, pickups[x][y].angle, context);
			}
		}
	}

	// Draw particles
	for (var i = 0; i < particles.length; i++) {
		drawParticle(particles[i], context);
		particles[i].timeElapsed++;
		if (particles[i].timeElapsed == particles[i].totalTime) {
			particles.splice(i, 1);
			i--;
		}
	}

	// Draw tanks
	for (i in tanks) {
		if (tanks[i].deadAt == Number.MAX_VALUE)
			drawTank(tanks[i], context, i == myPlayerNumber);
	}

	// Draw flags
	for (i in map.flagLocations) {
		var angle = 0;
		if (map.flagLocations[i].state == "Held") {
			angle = map.flagLocations[i].owner.direction;
		}
		drawFlag(i, map.flagLocations[i], angle, context);
	}

	// Draw bullets
	for (i in tanks) {
		drawBullet(tanks[i], context);
	}

	// Draw powerups
	for (i in tanks) {
		drawPowerup(tanks[i], context, tanks[i].powerup);
	}
};
