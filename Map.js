var getPath = function(x1, y1, x2, y2) {
	var queue = [{x: Math.floor(x1), y: Math.floor(y1), score: 0, previous: {}}];
	var alreadyExploredLocations = [Math.floor(x1) * map.height + Math.floor(y1)];
	var finalNode;

	while (queue.length > 0) {
		queue.sort(function(a, b) {
			return a.score - b.score;
		});

		for (var t = 0; t < 4; t++) {
			var x = queue[0].x + Math.round(Math.cos(t * Math.PI / 2));
			var y = queue[0].y + Math.round(Math.sin(t * Math.PI / 2));

			if (x >= 0 && y >= 0 && x < map.width && y < map.height && alreadyExploredLocations.indexOf(x * map.height + y) == -1) {
				var curTile = map.walls[queue[0].x][queue[0].y];
				if ((t == 0 && curTile.right) ||
					(t == 1 && curTile.down) ||
					(t == 2 && curTile.left) || 
					(t == 3 && curTile.up)) {

					// It is blocked
				} else {
					alreadyExploredLocations.push(x * map.height + y);
					var nextNode = {x: x, y: y, score: queue[0].score + 1, previous: queue[0]};
					if (x == Math.floor(x2) && y == Math.floor(y2)) {
						finalNode = nextNode;
						break;
					} else
						queue.push(nextNode);
				}
			}
		}

		queue.splice(0, 1);

		if (finalNode)
			break;
	}

	// Create final path
	var path = [];
	var curNode = finalNode;

	if (!finalNode) {
		return [];
	}

	while ("previous" in curNode) {
		var newElement = {x: curNode.x, y: curNode.y};
		path.unshift(newElement);
		curNode = curNode.previous;
	}
	return path;
};

var getDistance = function(x1, y1, x2, y2) {
	return getPath(x1, y1, x2, y2).length - 1;
};