var pressedKeys = {};

var gameKeydown = function(event) {
	pressedKeys[event.key] = true;
};

var gameKeyup = function(event) {
	if (event.key in pressedKeys) {
		delete pressedKeys[event.key];
	}
};

var curRotationDirection = 0;
var curDirectionVector = {x: 0, y: 0};

var lastTickSent = -1;
var curSendingTick = 0;
var gameInputLoop = function() {
	var curLatency = curSendingTick - tick;
	var desiredLatency = Math.ceil(averagePing / TICK_TIME);

	if (curSendingTick > lastTickSent) {
		var data = {};
		data.T = curSendingTick;
		data.what = "order";

		if (curSendingTick < tanks[myPlayerNumber].deadAt) {
			data.keys = Object.keys(pressedKeys);

			var hasLateralMotion = false;
			for (j in data.keys) {
				if (data.keys[j] == "ArrowUp" && !hasLateralMotion) {
					curDirectionVector = {x: DMath.cos(tanks[myPlayerNumber].direction), y: DMath.sin(tanks[myPlayerNumber].direction)};
					hasLateralMotion = true;
					if (tanks[myPlayerNumber].rSpeed < TANK_SPEED) {
						tanks[myPlayerNumber].rSpeed = Math.max(Math.min(tanks[myPlayerNumber].rSpeed + TANK_ACCELERATION, TANK_SPEED), -TANK_SPEED);
					}
					moveTank(tanks[myPlayerNumber], tanks[myPlayerNumber].rSpeed, true);
				} else if (data.keys[j] == "ArrowDown" && !hasLateralMotion) {
					curDirectionVector = {x: -DMath.cos(tanks[myPlayerNumber].direction), y: -DMath.sin(tanks[myPlayerNumber].direction)};
					hasLateralMotion = true;
					if (tanks[myPlayerNumber].rSpeed > -TANK_SPEED) {
						tanks[myPlayerNumber].rSpeed = Math.min(Math.max(tanks[myPlayerNumber].rSpeed - TANK_ACCELERATION, -TANK_SPEED), TANK_SPEED);
					}
					moveTank(tanks[myPlayerNumber], tanks[myPlayerNumber].rSpeed, true);
				} else if (data.keys[j] == "ArrowRight") {
					curRotationDirection = 1;
					rotateTank(tanks[myPlayerNumber], TANK_TURN_SPEED, true);
				} else if (data.keys[j] == "ArrowLeft") {
					curRotationDirection = -1;
					rotateTank(tanks[myPlayerNumber], -TANK_TURN_SPEED, true);
				}
			}
			if (!hasLateralMotion) {
				tanks[myPlayerNumber].rSpeed = 0;
			}
		}

		Network.send(data);
		
		curSendingTick++;
	}

	if (gameRunning) {
		if (curLatency > desiredLatency) {
			setTimeout(gameInputLoop, TICK_TIME + 2);
		} else {
			setTimeout(gameInputLoop, TICK_TIME);
		}
	}
};