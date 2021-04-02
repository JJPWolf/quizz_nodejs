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
const https = require('https');
const express = require('express');
const { Server } = require('ws');
const path = require('path')
const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';
console.log(PORT);
const server = express();
  server.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
  server.use('/css', express.static(path.join(__dirname, 'css/style.css')))
  server.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
  server.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
  //server.use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  //server.get("/", (req,res)=> res.sendFile(__dirname + "/public/index.html"))
  server.use('/', express.static('public'));
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
                    "creatorId" : clientId,
                    "nbQuestions" : nbQuestions,
                    "tpsQuestions" : tpsQuestions,
                    "clients": [{
                        "clientId" : clientId,
                        "pseudo" : clients[clientId].pseudo,
                        "ready" : false,
                        "score" : 0
                    }]
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
                game.clients.push({
                    "clientId" : clientId,
                    "pseudo": clients[clientId].pseudo,
                    "ready" : false,
                    "score" : 0
                });
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
        
            if(result.method === "startGame"){
                const gameId = result.gameId;
                const creatorId = result.clientId;

                if(games[gameId].creatorId === creatorId){   
                    const payLoad = {
                        "method" : "startGame",
                    }
                    games[gameId].clients.forEach((client)=>{
                        clients[client.clientId].connection.send(JSON.stringify(payLoad))
                    })
                }
            }

            if(result.method === "ready"){
                const clientId = result.clientId;
                const gameId = result.gameId;
                console.log(games[gameId].clients);
                let i=0;
                games[gameId].clients.forEach((client)=>{
                    if(client.clientId === clientId){
                        client.ready=true;
                    }
                    if(client.ready===true){
                        i++;
                    }
                });
                if(i == games[gameId].clients.length){
                    startGame(games[gameId]);
                }
            }

        if(result.method === "goodAnswer"){
            const clientId = result.clientId;
            const gameId = result.gameId;
            const points = result.points;
            games[gameId].clients.forEach((client)=>{
                if(client.clientId === clientId){
                    client.score+=parseInt(points);
                }
            })
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
function startGame(game){
    const tpsQuestions = game.tpsQuestions;
    const clients = game.clients;
    const nbQuestions = game.nbQuestions;
    setDelaySendQuestion((parseInt(tpsQuestions)+5)*1000,clients,tpsQuestions,nbQuestions);

}

function sendNewQuestion(clientsGame, tpsQuestions){
    console.log(clients);
    let randCat = Math.floor(Math.random() * JSONQuestions.length);
    console.log(randCat);
    let randSerie = Math.floor(Math.random() * JSONQuestions[randCat].questions.length);
    console.log(randSerie);
    let jsonFile = JSONQuestions[randCat].questions[randSerie];
    console.log(jsonFile);
    https.get(jsonFile,(res) => {
        let body = "";
    
        res.on("data", (chunk) => {
            body += chunk;
        });
    
        res.on("end", () => {
            try {
                let json = JSON.parse(body);
                let difficulte = {0 : "débutant", 1 : "confirmé", 2 : "expert"};
                let randomDiff = Math.floor(Math.random()*3);
                let question = json.quizz.fr[difficulte[randomDiff]][Math.floor(Math.random()*json.quizz.fr[difficulte[randomDiff]].length)];
                const payLoad = {
                    "method" : 'newQuestion',
                    "question" : question,
                    "temps" : tpsQuestions
                }
                clientsGame.forEach((client)=>{
                    clients[client.clientId].connection.send(JSON.stringify(payLoad))
                });
            } catch (error) {
                console.error(error.message);
            };
        });
    
    }).on("error", (error) => {
        console.error(error.message);
    });
}

function setDelaySendQuestion(tps, clients, tpsQuestions,nbQuestion){
    updateScore(clients);
    sendNewQuestion(clients, tpsQuestions);
    if(nbQuestion > 0){
        setTimeout(function(){
            setDelaySendQuestion(tps,clients,tpsQuestions,nbQuestion--);  
        }, tps);
    }
}

function updateScore(clientsGame){
    const payLoad = {
        "method" : 'updateScore',
        "clients" : clientsGame
    }
    clientsGame.forEach((client)=>{
        clients[client.clientId].connection.send(JSON.stringify(payLoad))
    });
}
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
        ]
    }

]