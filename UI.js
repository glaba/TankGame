var app;

window.onload = function () {
	initGraphics();

	app = new Vue({
		el: "#app",
		data: {
			currentScreen: "login",
			
			// Login
			username: "",

			// Lobbies
			lobbies: [],
			lobbySelection: "",

			// Create Lobby
			gameName: "",
			numPlayers: 1,

			// In lobby
			curLobbyUsers: [],

			// In game
			scores: [0, 0]
		},
		methods: {
			// Login
			login: Network.login,
		
			// Lobbies
			joinLobby: Network.joinLobby,
			createLobby: function() {
				app.currentScreen = "lobbyCreation";
			},

			// Create Lobby
			createGame: Network.createGame,

			// In lobby
			kick: Network.kick,
			leaveLobby: Network.leaveLobby,
			startGame: Network.startGame,
			changeTeamColor: Network.changeTeamColor,

			// In game
			gameKeydown: gameKeydown,
			gameKeyup: gameKeyup
		}
	});
}