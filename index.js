//////////////////////////////////////////////////////////////////////////////////////////////////
//                                        MUSILINKS                                             //
//////////////////////////////////////////////////////////////////////////////////////////////////
//                            By: Bernardo Luiz Knackfuss, 2020                                 //
//////////////////////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////
//                REQUIRES
/////////////////////////////////////////////////
const express = require("express"),
   http = require("http"),
   path = require("path"),
   bodyparser = require("body-parser"),
   fs = require("fs");

/////////////////////////////////////////////////
//                  STATE
/////////////////////////////////////////////////
var spotifyToken = null;
var spotifyExpiration = null;
var globalDate = null;

/////////////////////////////////////////////////
//               MAIN EXECUTION
/////////////////////////////////////////////////

// var test = require("./testrandom");
var getToken = require("./authentication");

refreshToken();
main();

async function main() {
   const app = express();

   app.set("port", process.env.PORT || 3000);
   app.set("views", __dirname + "/views");
   app.set("view engine", "ejs");
   //app.use(bodyparser.urlencoded({ extended: "true" }));
   app.use(express.static(path.join(__dirname, "public")));

   var jsonParser = bodyparser.json();

   app.use((err, _req, res, _next) => {
      console.error(err.stack);
      res.status(500).send("Error caught! Debug this bernardo...");
   });

   app.get("/", (_req, res) => {
      res.render("index", { 
         analyticsTagManagerUrl: process.env.ANALYTICS_GTM_URL,
         analyticsContainer: process.env.ANALYTICS_GTM_CONTAINER_ID, 
         analyticsUA: process.env.ANALYTICS_GA_UA 
      });
   });

   app.get("/token", async (_req, res) => {
      res.json({ token: spotifyToken, expiration: spotifyExpiration })
   });

   app.post("/search", jsonParser, async (req, res) => {
      let search = await searchMusicbrainz(req.body["search-text"]);
      res.json(search);
   });

   // app.get("/logs", async (req, res) => {
   //    if(req.query.pwd !== process.env.LOGPWD)
   //       return res.send('<h1>Unauthorized</h1>');
   // })

   // app.get("/test", async function(req,res){
   //    let rand = await test();
   //    res.send(`<h1>${rand.value}</h1>`);
   // })

   let server = http.createServer(app);
   server.on('error', (e) => console.log(e));

   server.listen(app.get("port"), function () {
      console.log("Server up and running on port " + app.get("port"));
   });
}

function countdown(expiration) {
   return new Promise(async (resolve) => {
      spotifyExpiration = expiration;
      let timer = setInterval(() => spotifyExpiration = spotifyExpiration - 1, 1000);
      let loop = () => {
         if (spotifyExpiration > 0) {
            // log(`Test log, spotifyExpiration = ${spotifyExpiration}`)
            setTimeout(loop, 1000);
         }
         else {
            log(`Countdown promise resolving, spotifyExpiration = ${spotifyExpiration}
now awaiting token renewal. ${globalDate}`);
            clearInterval(timer);
            resolve('ok');
         }
      }
      loop();
   });
}

async function refreshToken() {
   getToken()
      .then((auth) => {
         spotifyToken = auth.token;
         log(`Token acquired, spotifyToken = ${spotifyToken} and expiration = ${auth.
            expiration}.`);
         countdown(auth.expiration)
            .then(() => refreshToken());
      })
      .catch(exception => {
         if (exception.error === "RESPONSE_NOT_EXPECTED") {
            log(`\n RESPONSE_NOT_EXPECTED error. Here is response body: \n`);
         }
         else if (exception.error === "RESPONSE_ERROR") {
            log("\n RESPONSE_ERROR error. Here is error object: \n");
         }
         else {
            log("\n ERROR_UNKNOWN error. Here is details: \n");
         }
         for (const prop in exception.details) {
            log(`${prop} : ${exception.details[prop]} \n`);
         }
      });
}



function log(message) {
   globalDate = new Date();
   console.log("\n" + message + " :: " + globalDate.toJSON());
}