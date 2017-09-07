var Powerups = {
	missile: {
		create: function(tank) {
			var data = {};
			data.type = "missile";
			data.x = tank.x + TANK_SIZE / 2 * 1.2 * DMath.cos(tank.direction);
			data.y = tank.y + TANK_SIZE / 2 * 1.2 * DMath.sin(tank.direction);
			data.direction = tank.direction;
			data.totalTime = 1000;
			data.timeElapsed = 0;
			data.target = null;
			data.update = Powerups.missile.updateMissile;
			data.killsTank = Powerups.missile.killsTank;
			return data;
		},

		updateMissile: function(missile) {
			missile.timeElapsed++;

			var xComp = DMath.cos(missile.direction);
			var yComp = DMath.sin(missile.direction);

			var newX = missile.x + MISSILE_SPEED * xComp;
			var newY = missile.y + MISSILE_SPEED * yComp;
			var oldPosition = {x: missile.x, y: missile.y};
			var endPoint = {x: newX, y: newY};

			var curTileX = Math.floor(missile.x);
			var curTileY = Math.floor(missile.y);
			
			if ((Math.floor(newY) > curTileY && map.walls[curTileX][curTileY].down) || (Math.floor(newY) < curTileY && map.walls[curTileX][curTileY].up)) {
				yComp *= -1;
				missile.direction = DMath.atan2(xComp, yComp);
			}
			if ((Math.floor(newX) > curTileX && map.walls[curTileX][curTileY].right) || (Math.floor(newX) < curTileX && map.walls[curTileX][curTileY].left)) {
				xComp *= -1;
				missile.direction = DMath.atan2(xComp, yComp);
			}

			if (missile.timeElapsed < 100) {
				missile.x += MISSILE_SPEED * DMath.cos(missile.direction);
				missile.y += MISSILE_SPEED * DMath.sin(missile.direction);
				return;
			}
		
			// Targeting
			var bestTarget = null;
			var bestDistance = map.width * map.height + 1;
			for (i in tanks) {
				var curDist = getDistance(missile.x, missile.y, tanks[i].x, tanks[i].y);
				if (curDist < bestDistance) {
					bestTarget = tanks[i];
					bestDistance = curDist;
				}
			}
			missile.target = bestTarget;

			// Find the target for the missile to currently go towards
			var targetPoint;
			var pathToBestTank = getPath(missile.x, missile.y, bestTarget.x, bestTarget.y);
			if (pathToBestTank.length > 2) {
				targetPoint = {x: pathToBestTank[1].x + 0.5, y: pathToBestTank[1].y + 0.5};
			} else {
				targetPoint = {x: bestTarget.x, y: bestTarget.y};
			}


			// Rotate to face target point
			var goalAngle = DMath.atan2(targetPoint.x - missile.x, targetPoint.y - missile.y); // Goes from -pi to pi
			if (goalAngle < 0)
				goalAngle = 2 * Math.PI + goalAngle;

			var turningDirection = 0;
			var normalizedMissileAngle = missile.direction;
			while (normalizedMissileAngle < 0) normalizedMissileAngle += 2 * Math.PI;
			while (normalizedMissileAngle >= 2 * Math.PI) normalizedMissileAngle -= 2 * Math.PI;

			if (Math.abs(goalAngle - normalizedMissileAngle) > Math.PI) {
				turningDirection = -DMath.sign(goalAngle - normalizedMissileAngle);
			} else {
				turningDirection = DMath.sign(goalAngle - normalizedMissileAngle);
			}

			missile.direction += turningDirection * MISSILE_TURN_SPEED / (2 * Math.PI) * Math.abs(goalAngle - normalizedMissileAngle);
			missile.x += MISSILE_SPEED * DMath.cos(missile.direction);
			missile.y += MISSILE_SPEED * DMath.sin(missile.direction);
		},

		killsTank: function(missile, targetTank) {
			var p1x = targetTank.x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(targetTank.direction + Math.PI / 4);
			var p1y = targetTank.y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(targetTank.direction + Math.PI / 4);
			var p2x = targetTank.x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(targetTank.direction + 3 * Math.PI / 4);
			var p2y = targetTank.y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(targetTank.direction + 3 * Math.PI / 4);
			var p4x = targetTank.x + TANK_SIZE / DMath.sqrt(2) * DMath.cos(targetTank.direction - Math.PI / 4);
			var p4y = targetTank.y + TANK_SIZE / DMath.sqrt(2) * DMath.sin(targetTank.direction - Math.PI / 4);
			var p21 = {x: p2x - p1x, y: p2y - p1y};
			var p41 = {x: p4x - p1x, y: p4y - p1y};
			var pBullet1 = {x: missile.x - p1x, y: missile.y - p1y};
			if (pBullet1.x * p21.x + pBullet1.y * p21.y >= 0 &&
				pBullet1.x * p21.x + pBullet1.y * p21.y <= p21.x * p21.x + p21.y * p21.y &&
				pBullet1.x * p41.x + pBullet1.y * p41.y >= 0 &&
				pBullet1.x * p41.x + pBullet1.y * p41.y <= p41.x * p41.x + p41.y * p41.y) {

				missile.timeElapsed = missile.totalTime;
				return true;
			}
		}
	}
};