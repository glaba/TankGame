var WebSocketServer = require("websocket").server;
var http = require("http");

var server = http.createServer(function(request, response){});
server.listen(666, function(){});

wsServer = new WebSocketServer({httpServer: server});

var clients = {};
var userInfo = {};

var lobbies = [];
var games = [];

var TEAM_COLORS = ["red", "blue"];

var getLobbyFromUserIndex = function(userIndex) {
	for (i in lobbies) {
		for (j in lobbies[i].players) {
			if (lobbies[i].players[j].index == userIndex)
				return i;
		}
	}
	return -1;
};

var getGameFromUserIndex = function(userIndex) {
	for (i in games) {
		for (j in games[i].players) {
			if (games[i].players[j].index == userIndex)
				return i;
		}
	}
	return -1;
};

var sendLobbyUpdate = function(client) {
	if (client) {
		client.send(JSON.stringify({
			what: "lobby-update",
			lobbies: lobbies
		}));
	} else {
		for (i in clients) {
			clients[i].send(JSON.stringify({
				what: "lobby-update",
				lobbies: lobbies,
				lobbyIndex: getLobbyFromUserIndex(i)
			}));
		}
	}
};

var sendMessageToGame = function(gameIndex, message) {
	for (i in games[gameIndex].players) {
		var index = games[gameIndex].players[i].index;
		clients[index].send(JSON.stringify(message));
	}
};

var killLobby = function(index) {
	lobbies.splice(index, 1);
};

wsServer.on("request", function(request) {
    var connection = request.accept(null, request.origin);
    console.log("Connected to " + request.remoteAddress);

    // Find an index to assign it to
    var index = 0;
    while (index in clients)
    	index++;

    clients[index] = connection;
    userInfo[index] = {username: "~"};

    connection.on("message", function(message) {
        if (message.type === "utf8") {
            var data = JSON.parse(message.utf8Data);

            if (data.what == "login") {
            	if (userInfo[index].username == "~" && data.username != "~") {
					userInfo[index].username = data.username;	
            		console.log("Logged in " + data.username);
            	}

            	sendLobbyUpdate(clients[index]);
        	} else if (data.what == "ping") {
                clients[index].send(JSON.stringify({
                    what: "ping",
                    time: data.time
                }));
            } else if (data.what == "join-lobby") {
        		for (i in lobbies) {
        			if (lobbies[i].name == data.lobbyName) {
        				if (lobbies[i].players.length < lobbies[i].numPlayers && !userInfo[index].inLobby) {
        					lobbies[i].players.push({index: index, username: userInfo[index].username, teamColor: TEAM_COLORS[0]});
        					userInfo[index].inLobby = true;
        					sendLobbyUpdate();
        					console.log(lobbies);
        				}
        				break;
        			}
        		}
        	} else if (data.what == "create-game") {
        		lobbies.push({
        			name: data.lobbyName,
        			numPlayers: data.numPlayers,
        			players: [{index: index, username: userInfo[index].username, teamColor: TEAM_COLORS[0]}]
        		});
        		sendLobbyUpdate();
        	} else if (data.what == "kick") {
        		var lobbyIndex = getLobbyFromUserIndex(index);
        		if (lobbyIndex >= 0 && lobbies[lobbyIndex].players[0].index == index) {
        			for (j in lobbies[lobbyIndex].players) {
        				if (lobbies[lobbyIndex].players[j].username == data.username) {
        					userInfo[lobbies[lobbyIndex].players[j].index].inLobby = false;
        					lobbies[lobbyIndex].players.splice(j, 1);
        					if (lobbies[lobbyIndex].players.length == 0) {
        						killLobby(lobbyIndex);
        					}
        					sendLobbyUpdate();
        				}
        			}
        		}
        	} else if (data.what == "leave-lobby") {
        		var lobbyIndex = getLobbyFromUserIndex(index);
        		if (lobbyIndex >= 0) {
        			for (j in lobbies[lobbyIndex].players) {
        				if (lobbies[lobbyIndex].players[j].index == index) {
        					userInfo[lobbies[lobbyIndex].players[j].index].inLobby = false;
        					lobbies[lobbyIndex].players.splice(j, 1);
        					if (lobbies[lobbyIndex].players.length == 0) {
        						killLobby(lobbyIndex);
        					}
        					sendLobbyUpdate();
        				}
        			}
        		}
        	} else if (data.what == "change-team-color") {
        		var i = getLobbyFromUserIndex(index);
        		if (i >= 0) {
        			for (j in lobbies[i].players) {
        				if (lobbies[i].players[j].username == data.username) {
        					if (lobbies[i].players[0].index == index || lobbies[i].players[j].index == index) {
        						// Either the leader or that player can change their color
        						var newColorIndex = (TEAM_COLORS.indexOf(lobbies[i].players[j].teamColor) + 1) % TEAM_COLORS.length;
        						lobbies[i].players[j].teamColor = TEAM_COLORS[newColorIndex];
        						sendLobbyUpdate();
        					}
        				}
        			}
        		}
        	} else if (data.what == "start-game") {
        		var i = getLobbyFromUserIndex(index);
        		if (i >= 0 && lobbies[i].players[0].index == index) {
        			var newGame = {};
        			newGame.numPlayers = lobbies[i].numPlayers;
        			newGame.players = lobbies[i].players;
        			newGame.tick = 0;
        			newGame.orders = {"0": []};
        			games.push(newGame);

        			var tanks = [];
        		
                    var map = {};
                    map.spawnLocations = [[{x: 10.5, y: 0.5, direction: Math.PI / 2}], [{x: 0.5, y: 10.5, direction: 3 * Math.PI / 2}]]; 
                    map.flagSpawnLocations = [{x: 0.5, y: 0.5}, {x: 10.5, y: 10.5}];
                    map.flagLocations = [{x: 0.5, y: 0.5, state: "Safe"}, {x: 10.5, y: 10.5, state: "Safe"}];
                    map.width = 11;
                    map.height = 11;

        			for (j in newGame.players) {
                        var team = TEAM_COLORS.indexOf(newGame.players[j].teamColor);
        				tanks.push({x: map.spawnLocations[team][0].x, y: map.spawnLocations[team][0].y, direction: map.spawnLocations[team][0].direction, team: TEAM_COLORS.indexOf(newGame.players[j].teamColor), playerNumber: 0});
        			}

                    map.walls = [];
                    for (var x = 0; x < map.width; x++) {
                        map.walls.push([]);
                        for (var y = 0; y < map.height; y++) {
                            map.walls[x].push({down: Math.random() > 0.7, right: Math.random() > 0.7});
                        }
                    }

                    for (var x = 0; x < map.width; x++) {
                        for (var y = 0; y < map.height; y++) {
                            var newX = map.width - x - 1;
                            var newY = map.height - y - 1;

                            if (newY - 1 >= 0)
                                map.walls[newX][newY - 1].down = map.walls[x][y].down;
                            if (newX - 1 >= 0) 
                                map.walls[newX - 1][newY].right = map.walls[x][y].right;
                        }
                    }

                    var randomSeed = Math.floor(Math.random() * 1000000);
        			for (j in newGame.players) {
        				clients[newGame.players[j].index].send(JSON.stringify({
        					what: "start-game",
        					map: map,
        					tanks: tanks,
        					myPlayerNumber: j,
        					seed: randomSeed
        				}));
        			}
        		}
        	} else if (data.what == "order") {
                var i = getGameFromUserIndex(index);
                if (i >= 0) {
                    var playerNum = -1;
                    for (var j in games[i].players) {
                        if (games[i].players[j].index == index) {
                            playerNum = j;
                            break;
                        }
                    }

                    console.log(`Get ${data.T} from ${playerNum}`);

                    if (!games[i].orders[Number(data.T)]) {
                        games[i].orders[Number(data.T)] = [];
                    }
                    games[i].orders[Number(data.T)].push({playerNumber: playerNum, keys: data.keys});

        			if (games[i].tick in games[i].orders && games[i].orders[games[i].tick].length == games[i].players.length) {
        				console.log(`Send tick ${games[i].tick}`);
                        for (j in games[i].players) {
        					clients[games[i].players[j].index].send(JSON.stringify({
        						what: "tick",
        						keys: games[i].orders[games[i].tick],
        						tick: games[i].tick
        					}));
        				}

        				games[i].tick++;
        			}
        		}
        	}
        }
    });

    connection.on("close", function(connection) {
    	console.log("Disconnected from " + request.origin);

    	for (i in lobbies) {
    		for (j in lobbies[i].players) {
    			if (lobbies[i].players[j].index == index) {
    				lobbies[i].players.splice(j, 1);
    				if (lobbies[i].players.length == 0) {
    					killLobby(i);
    				}
    				sendLobbyUpdate();
    			}
    		}
    	}
    	for (i in games) {
    		for (j in games[i].players) {
    			if (games[i].players[j].index == index) {
    				sendMessageToGame(i, {
    					what: "player-left",
    					username: games[i].players[j].username
    				});
    				games[i].players.splice(j, 1);
    			}
    		}
    	}

        delete clients[index];
        delete userInfo[index];
    });
});
