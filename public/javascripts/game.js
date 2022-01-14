let cards = ["a", "a", "b", "b", "c", "c", "d", "d", "e", "e", "f", "f"]
let oneCard = true
let firstCard;
let lock = true
let pairs = 6;
let player = false
let you = 0;
let opponent = 0;
let yes = new Audio("audio/yes.wav");
let no = new Audio("audio/no.wav");

const ws = new WebSocket("ws://localhost:3000")
ws.addEventListener("open", () => console.log("We are connected!"))

ws.addEventListener("message", msg => {
    msg = JSON.parse(msg.data)
    switch (msg.header) {
    case messages.START:
        alert("The game has started!")
        cards = msg.body.cards
        player = msg.body.player
        show()
        break
    case messages.WAITING:
        alert("Waiting for the other player!")
        break
    case messages.TERMINATION:
        player = true
        opponent = msg.body.point
        show()
        revealCards(msg.body.no_match)
        break
    case messages.END:
        opponent = msg.body.point
        end()
        show()
        break
    case messages.PAIR:
        opponent = msg.body.point
        pairs = msg.body.pairs
        show()
        removeCards(msg.body.match)
        break
    case messages.DISCONNECT:
        alert("The player disconnected!")
        player = false
        break
    }
});

function removeCards(removed)
{
    cardReveal(removed[0], removed[1])
    setTimeout(() => hide(removed[0], removed[1]), 750)
}

function revealCards(no_match){
    cardReveal(no_match[0], no_match[1])
    setTimeout(() => restore(no_match[0], no_match[1]), 1000)
}

function cardReveal(nr1, nr2)
{
    let photo = "url(images/" + cards[nr1] + ".png);";
    document.getElementById("c" + nr1).setAttribute("style", "background-image: " + photo);
    document.getElementById("c" + nr1).className = "cardActive";
    photo = "url(images/" + cards[nr2] + ".png);";
    document.getElementById("c" + nr2).setAttribute("style", "background-image: " + photo);
    document.getElementById("c" + nr2).className = "cardActive";
}

function reveal(nr)
{
    if (!player)
        return;
    let opacityValue = document.getElementById("c" + nr).getAttribute("style");
    if (lock && (opacityValue == null || opacityValue != "opacity: 0"))
    {
        lock = false;
        let photo = "url(images/" + cards[nr] + ".png);";
        document.getElementById("c" + nr).setAttribute("style", "background-image: " + photo);
        document.getElementById("c" + nr).className = "cardActive";

        if (oneCard)
        {
            oneCard = false;
            firstCard = nr;
            lock = true;
        }
        else if (firstCard != nr)
        {
            if (cards[firstCard] == cards[nr])
            {
                you = you + 10
                pairs--
                if(pairs!=0)
                    setTimeout(() => hide(nr, firstCard), 750)
                yes.play()

                ws.send(JSON.stringify({
                    header: messages.PAIR,
                    body: {
                        match: [nr, firstCard],
                        point: you,
                        pairs: pairs
                    }
                }))
            }
            else
            {
                setTimeout(() => restore(nr, firstCard), 1000)
                no.play()
                player = !player

                ws.send(JSON.stringify({
                    header: messages.TERMINATION,
                    body: {
                        no_match: [nr, firstCard],
                        point: you
                    }
                }))
            }
            oneCard = true;
        }
        else
            lock = true;
    }
}

function hide(nr1, nr2)
{
    document.getElementById("c"+nr1).setAttribute("style", "opacity: 0");
    document.getElementById("c"+nr2).setAttribute("style", "opacity: 0");
    lock = true;
    show();
    if(pairs==0)
    {
        end()
        ws.send(JSON.stringify({
            header: messages.END,
            body: {
                point: you
            }
        }))
        ws.send(JSON.stringify({
            header: messages.STATICS,
            body: {
                you: you,
                opponent: opponent
            }
        }))
    }
}

function end()
{
    if(you>opponent)
            document.getElementById("board").innerHTML = "<h2>You won!<br>Congratulations!</h2>";
    else if(you==opponent)
        document.getElementById("board").innerHTML = "<h2>Draw!</h2>";
    else
        document.getElementById("board").innerHTML = "<h2>You lost!<br>Opponent won!</h2>";
}

function restore(nr1, nr2)
{
    document.getElementById("c"+nr1).setAttribute("style", "background-image: url(images/card.png);");
    document.getElementById("c"+nr2).setAttribute("style", "background-image: url(images/card.png);");
    document.getElementById("c"+nr1).className = "card";
    document.getElementById("c"+nr2).className = "card";
    lock = true;
    show();
}

function show()
{
    document.getElementById("you").innerHTML = `YOU<br>Score:<br>${you}`;
    if(player)
        document.getElementById("turn").innerHTML = "Turn:<br>You";
    else
        document.getElementById("turn").innerHTML = "Turn:<br>Opponent";
    document.getElementById("opponent").innerHTML = `OPPONENT<br>Score:<br>${opponent}`;
}