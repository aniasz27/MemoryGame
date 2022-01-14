const express = require("express")
const crypto = require('crypto')
const http = require("http")
const wsLib = require("ws")
const messages = require("./public/javascripts/messages")

const gameStatus = require("./statTracker")
const port = process.argv[2]
const app = express()

const indexRouter = require("./routes/index")
const { header } = require("express/lib/request")

app.set('view engine', 'ejs')
app.use(express.static(__dirname + "/public"))
const server = http.createServer(app).listen(port)

app.get("/play", indexRouter)
app.get("/", indexRouter)
const wss = new wsLib.WebSocketServer({ server })

let games = []
let gamers = new Map()

//shuffle the array
function shuffle(array)
{
	let currentIndex = array.length, randomIndex
	while(currentIndex !=0)
	{
		randomIndex = Math.floor(Math.random()*currentIndex)
		currentIndex--
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
	}
	return array
}

//send the message to the player and also print the message in the console
const send = (ws, msg) =>
{
	console.log(`>>> (${ ws.id })`, msg)
	ws.send(JSON.stringify(msg))
}

//generate unique ID for the game
const generateID = () => crypto.randomBytes(8).toString('hex')

//add player to the game
const addPlayerToGame = (ws, game) =>
{
	gamers.set(ws, game)
	console.log(`Added ${ ws.id } to game ${ game.id }`)
}

//print in the console numbers of the games being played and games in total
setInterval(() =>
{
	console.log('there are', gameStatus.gamesOngoing, 'games being played')
	console.log('there are', games.length, 'games in total')
}, 10000)

//wait for the connection from the player
wss.on("connection", ws => {
	ws.id = generateID()
	let game
	//add the player to the game if there is a game with only one player
	for (const g of games) {
		if (g.player2 != null) continue
		game = g
		game.player2 = ws
		console.log()
		addPlayerToGame(ws, game)
		const cards = shuffle(["a", "a", "b", "b", "c", "c", "d", "d", "e", "e", "f", "f"])
		send(ws, ({
			header: messages.START,
			body: {
				cards: cards,
				player: false
		}}))
		send(game.player1, {
			header: messages.START,
			body: {
				cards: cards,
				player: true
			}
		})
		gameStatus.gamesOngoing++
		game.ongoing = true
		break
	}

	//if all games are full, create a new one and add a player
	if (typeof game == "undefined") {
		const game = { player1: ws, ongoing: false, id: generateID() }
		games.push(game)
		addPlayerToGame(ws, game)
		send(ws, { header: messages.WAITING })
	}

	//if player disconnects
	ws.on("close", () => {
		const game = gamers.get(ws)
		if (game == null) return
		//send the message to the other player that player disconnected
		if(game.ongoing){
			send(game.player1 == ws ? game.player2 : game.player1, {header: messages.DISCONNECT})
			gameStatus.gamesOngoing--
		}
		//remove this game because a player disconnected
		games = games.filter(g => g != game)
		game.ongoing = false
	})

	ws.on("message", msg =>
	{
		const game = gamers.get(ws)
		msg = JSON.parse(msg)

		if (game == null) return

		//send the message to the other player based on header
		switch (msg.header)
		{
			case messages.TERMINATION:
				send(game.player1 == ws ? game.player2 : game.player1, msg)
				break

			case messages.END:
				send(game.player1 == ws ? game.player2 : game.player1, msg)
				games = games.filter(g => g != game)
				gameStatus.gamesOngoing--
				gameStatus.gamesCompleted++
				game.ongoing = false
				break

			case messages.PAIR:
				send(game.player1 == ws ? game.player2 : game.player1, msg)
				break

			case messages.STATICS:
				let first = msg.body.you
				let second = msg.body.opponent
				gameStatus.highestScore = first>second ? first : second
				break
		}
	})
})