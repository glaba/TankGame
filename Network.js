var socket = new WebSocket("ws://localhost:666");
var averagePing = 0;

var Network = {
	send: function(object) {
		setTimeout(function() {
			socket.send(JSON.stringify(object));
		}, 0);
	},

	login: function() {
		Network.send({what: "login", username: app.username});
		app.currentScreen = "lobbies";
	},

	joinLobby: function() {
		Network.send({what: "join-lobby", lobbyName: app.lobbySelection});
	},

	createGame: function() {
		Network.send({what: "create-game", lobbyName: app.gameName, numPlayers: app.numPlayers});
	},

	kick: function(username) {
		Network.send({what: "kick", username: username});
	},

	leaveLobby: function() {
		Network.send({what: "leave-lobby"});
	},

	changeTeamColor: function(username) {
		Network.send({what: "change-team-color", username: username});
	},

	startGame: function() {
		Network.send({what: "start-game"});
	},

	ping: function() {
		Network.send({what: "ping", time: Date.now()});
	}
};

socket.onopen = function(event) {
	console.log("Connected");

	// Start ping testing
	setInterval(Network.ping, 20);
};

socket.onerror = function(error) {
	console.log("Error: " + error);
};

socket.onmessage = function(event) {
	var data = JSON.parse(event.data);

	if (data.what == "lobby-update") {
		app.lobbies = data.lobbies;

		if (data.lobbyIndex == -1 && app.currentScreen != "lobbyCreation") {
			app.currentScreen = "lobbies";
		} else if (data.lobbyIndex >= 0) {
			app.currentScreen = "gameLobby";
			app.curLobbyUsers = data.lobbies[data.lobbyIndex].players;
		}
	} else if (data.what == "start-game") {
		gameRunning = true;

		// requires map json, array of tank objects {x, y, direction, team, playerNumber}
		// data.map, data.tanks, data.seed
		app.currentScreen = "playing";

		DMath.setRandomSeed(data.seed);

		map = data.map;
		pickups = [];
		for (var x = 0; x < map.width; x++) {
			pickups.push([]);
			for (var y = 0; y < map.height; y++) {
				if (x > 0) {
					map.walls[x][y].left = map.walls[x - 1][y].right;
				} else {
					map.walls[x][y].left = true;
				}

				if (y > 0) {
					map.walls[x][y].up = map.walls[x][y - 1].down;
				} else {
					map.walls[x][y].up = true;
				}

				if (y == map.height - 1) {
					map.walls[x][y].down = true;
				}
				if (x == map.width - 1) {
					map.walls[x][y].right = true;
				}
				
				pickups[x].push({type: "None", angle: 0});
			}
		}

		tick = 0;
		for (var i in data.tanks) {
			var curTank = data.tanks[i];
			tanks.push({x: curTank.x, y: curTank.y, rx: curTank.x, ry: curTank.y, direction: curTank.direction, rDirection: curTank.direction, team: curTank.team, playerNumber: curTank.playerNumber,
			            bulletX: -1, bulletY: -1, bulletRemainingLifetime: 400, bulletDefaultLifetime: 400, bulletXComp: 0, bulletYComp: 0,
			            deadAt: Number.MAX_VALUE, powerup: {type: "None"}, speed: 0, rSpeed: 0});
		}

		myPlayerNumber = data.myPlayerNumber;

		gameInputLoop();
	} else if (data.what == "tick") {
		orders[data.tick] = data.keys;
		simulateTick();
		render();
	} else if (data.what == "ping") {
		var deltaTime = Date.now() - data.time;
		averagePing = (averagePing * 4 + deltaTime) / 5;
	}
};