/*
let PORT = process.env.PORT || 9091;
const http = require("http");

const express = require("express")
const path = require('path')

const app = express();
//bootstrap
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))

app.get("/", (req,res)=> res.sendFile(__dirname + "/index.html"))

app.listen(PORT, ()=>console.log("Listening on http port "+PORT))

const websocketServer = require("websocket").server
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("Listening.. on 9090"))
//hashmap clients
const clients = {};
const games = {};

const wsServer = new websocketServer({
    "httpServer": httpServer
})
*/
'use strict';

const express = require('express');
const { Server } = require('ws');
const path = require('path')
const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';
console.log(PORT);
const server = express();
  server.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
  server.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
  server.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
  //server.use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  server.get("/", (req,res)=> res.sendFile(__dirname + "/index.html"))
  let httpServer = server.listen(PORT, () => console.log(`Listening on ${PORT}`));

//hashmap clients
const clients = {};
const games = {};
const wss = new Server({ server : httpServer });

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('close', () => console.log('Client disconnected'));
    ws.on("message", message => {
            const result = JSON.parse(message)
            //I have received a message from the client
            //a user want to create a new game
            if (result.method === "create") {
                const clientId = result.clientId;
                const nbQuestions = result.nbQuestions;
                const tpsQuestions = result.tpsQuestions;
                const gameId = guid();
                games[gameId] = {
                    "id": gameId,
                    "balls": 20,
                    "nbQuestions" : nbQuestions,
                    "tpsQuestions" : tpsQuestions,
                    "clients": [
                        {
                            "clientId" : clientId,
                            "pseudo" : clients[clientId].pseudo
                        }
                    ]
                }
    
                const payLoad = {
                    "method": "create",
                    "game" : games[gameId]
                }
    
                const con = clients[clientId].connection;
                con.send(JSON.stringify(payLoad));
            }
    
            if(result.method === "setPseudo"){
                const clientId = result.clientId;
                const pseudo = result.pseudo;
                clients[clientId].pseudo = pseudo;
            }
    
            //a client want to join
            if (result.method === "join") {
    
                const clientId = result.clientId;
                const gameId = result.gameId;
                const game = games[gameId];
                if (game.clients.length >= 3) 
                {
                    //sorry max players reach
                    return;
                }
                const color =  {"0": "Red", "1": "Green", "2": "Blue"}[game.clients.length]
                game.clients.push({
                    "clientId": clientId,
                    "color": color
                })
                //start the game
                if (game.clients.length === 3) updateGameState();
    
                const payLoad = {
                    "method": "join",
                    "game": game
                }
                //loop through all clients and tell them that people has joined
                game.clients.forEach(c => {
                    clients[c.clientId].connection.send(JSON.stringify(payLoad))
                })
            }
            //a user plays
            if (result.method === "play") {
                const gameId = result.gameId;
                const ballId = result.ballId;
                const color = result.color;
                let state = games[gameId].state;
                if (!state)
                    state = {}
                
                state[ballId] = color;
                games[gameId].state = state;
                
            }
        

    })
    //generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        "connection":  ws,
        "pseudo" : ""
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }
    //send back the client connect
    ws.send(JSON.stringify(payLoad))
    
});
/*
wss.on("request", request => {
    console.log("Handling request from " + request.origin);
    //connect
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"))
    connection.on("close", () => console.log("closed!"))
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data)
        console.log(result);
        //I have received a message from the client
        //a user want to create a new game
        if (result.method === "create") {
            const clientId = result.clientId;
            const nbQuestions = result.nbQuestions;
            const tpsQuestions = result.tpsQuestions;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "nbQuestions" : nbQuestions,
                "tpsQuestions" : tpsQuestions,
                "clients": [
                    {
                        "clientId" : clientId,
                        "pseudo" : clients[clientId].pseudo
                    }
                ]
            }

            const payLoad = {
                "method": "create",
                "game" : games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        if(result.method === "setPseudo"){
            const clientId = result.clientId;
            const pseudo = result.pseudo;
            clients[clientId].pseudo = pseudo;
        }

        //a client want to join
        if (result.method === "join") {

            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if (game.clients.length >= 3) 
            {
                //sorry max players reach
                return;
            }
            const color =  {"0": "Red", "1": "Green", "2": "Blue"}[game.clients.length]
            game.clients.push({
                "clientId": clientId,
                "color": color
            })
            //start the game
            if (game.clients.length === 3) updateGameState();

            const payLoad = {
                "method": "join",
                "game": game
            }
            //loop through all clients and tell them that people has joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }
        //a user plays
        if (result.method === "play") {
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;
            let state = games[gameId].state;
            if (!state)
                state = {}
            
            state[ballId] = color;
            games[gameId].state = state;
            
        }

    })
    
    //generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        "connection":  connection,
        "pseudo" : ""
    }

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }
    //send back the client connect
    connection.send(JSON.stringify(payLoad))

})
*/

function updateGameState(){

    //{"gameid", fasdfsf}
    for (const g of Object.keys(games)) {
        const game = games[g]
        const payLoad = {
            "method": "update",
            "game": game
        }

        game.clients.forEach(c=> {
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        })
    }

    setTimeout(updateGameState, 500);
}



function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();

const JSONQuestions  = [
    {
        cat : "Animaux",
        questions : [
            "https://www.kiwime.com/oqdb/files/3237929525/OpenQuizzDB_237/openquizzdb_237.json",
            "https://www.kiwime.com/oqdb/files/2175987377/OpenQuizzDB_175/openquizzdb_175.json",
            "https://www.kiwime.com/oqdb/files/2184784477/OpenQuizzDB_184/openquizzdb_184.json",
            "https://www.kiwime.com/oqdb/files/1049854563/OpenQuizzDB_049/openquizzdb_49.json",
            "https://www.kiwime.com/oqdb/files/2173877467/OpenQuizzDB_173/openquizzdb_173.json",
            "https://www.kiwime.com/oqdb/files/5413686632/OpenQuizzDB_413/openquizzdb_413.json",
            "https://www.kiwime.com/oqdb/files/1048723782/OpenQuizzDB_048/openquizzdb_48.json",
            "https://www.kiwime.com/oqdb/files/1048723782/OpenQuizzDB_048/openquizzdb_48.json",
            "https://www.kiwime.com/oqdb/files/2145399587/OpenQuizzDB_145/openquizzdb_145.json",
            "https://www.kiwime.com/oqdb/files/1010726823/OpenQuizzDB_010/openquizzdb_10.json"
        ]
    },
    {
        cat : "Art et archéologie",
        questions : [
            "https://www.kiwime.com/oqdb/files/1086624389/OpenQuizzDB_086/openquizzdb_86.json",
            "https://www.kiwime.com/oqdb/files/2156553397/OpenQuizzDB_156/openquizzdb_156.json",
            "https://www.kiwime.com/oqdb/files/2183543422/OpenQuizzDB_183/openquizzdb_183.json",
            "https://www.kiwime.com/oqdb/files/2128644638/OpenQuizzDB_128/openquizzdb_128.json",
            "https://www.kiwime.com/oqdb/files/1069848949/OpenQuizzDB_069/openquizzdb_69.json",
            ""
        ]
    }

]