const express = require("express");
const router = express.Router();

const gameStatus = require("../statTracker");

router.get("/play", function(req, res) {
  res.sendFile("game.html", { root: "./public" });
});

router.get("/", function(req, res) {
  res.render("splash.ejs", {
    gamesCompleted: gameStatus.gamesCompleted,
    gamesOngoing: gameStatus.gamesOngoing,
    highestScore: gameStatus.highestScore
  });
});

module.exports = router;