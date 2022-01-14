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

const send = (ws, msg) =>
{
	console.log(`>>> (${ ws.id })`, msg)
	ws.send(JSON.stringify(msg))
}

const generateID = () => crypto.randomBytes(8).toString('hex')

const addPlayerToGame = (ws, game) =>
{
	gamers.set(ws, game)
	console.log(`Added ${ ws.id } to game ${ game.id }`)
}

setInterval(() =>
{
	console.log('there are', gameStatus.gamesOngoing, 'games being played')
	console.log('there are', games.length, 'games in total')
}, 5000)

wss.on("connection", ws => {
	ws.id = generateID()
	let game
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

	if (typeof game == "undefined") {
		const game = { player1: ws, ongoing: false, id: generateID() }
		games.push(game)
		addPlayerToGame(ws, game)
		send(ws, { header: messages.WAITING })
	}

	ws.on("close", () => {
		const game = gamers.get(ws)
		if (game == null) return
		if (!game.ongoing)
		{
			// Remove this game because player 1 disconnected
			// and it is no longer waiting for player 2.
			games = games.filter(g => g != game)
			return
		}

		send(game.player1 == ws ? game.player2 : game.player1, {header: messages.DISCONNECT})

		// Remove this game because a player disconnected.
		games = games.filter(g => g != game)
		game.ongoing = false
		gameStatus.gamesOngoing--
	})

	ws.on("message", msg =>
	{
		const game = gamers.get(ws)
		msg = JSON.parse(msg)

		if (game == null)
		{
			send(ws, {
				"wrong": "wrong"
			})
			return
		}

		switch (msg.header)
		{
			case messages.TERMINATION:
			{
				if(game.player1 == ws)
				{
					send(game.player2, msg)
				}
				else
				{
					send(game.player1, msg)
				}
				
				break
			}

			case messages.END:
			{
				if(game.player1 == ws)
				{
					send(game.player2, msg)
				}
				else
				{
					send(game.player1, msg)
					games = games.filter(g => g != game)
					gameStatus.gamesOngoing--
					gameStatus.gamesCompleted++
					game.ongoing = false
				}

				break
			}

			case messages.PAIR:
			{
				if(game.player1 == ws)
				{
					send(game.player2, msg)
				}
				else
				{
					send(game.player1, msg)
				}

				break
			}

			case messages.STATICS:
			{
				let first = msg.body.you
				let second = msg.body.opponent

				if(first>second)
				{
					gameStatus.highestScore = first
				}
				else
				{
					gameStatus.highestScore = second
				}

				break
			}
		}
	})
})