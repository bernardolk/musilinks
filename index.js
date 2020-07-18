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
   bodyparser = require("body-parser");

/////////////////////////////////////////////////
//                  STATE
/////////////////////////////////////////////////
var spotifyToken = null;
var spotifyExpiration = null;

/////////////////////////////////////////////////
//               MAIN EXECUTION
/////////////////////////////////////////////////
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

   app.use(function (err, req, res, next) {
      console.error(err.stack);
      res.status(500).send("Error caught! Debug this bernardo...");
   });

   app.get("/", function (req, res) {
      res.render("index");
   });

   app.get("/token", async function (req, res) {
      res.json({ token: spotifyToken, expiration: spotifyExpiration})
   });

   app.post("/search", jsonParser, async function (req, res) {
      let search = await searchMusicbrainz(req.body["search-text"]);
      res.json(search);
   });

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
            setTimeout(loop, 1000);
         }
         else{
            clearInterval(timer);
            resolve('ok');
         }
      }
      loop();
   });
}

function refreshToken() {
   require("./authentication")
      .then((auth) => {
         spotifyToken = auth.token;
         countdown(auth.expiration)
            .then(() => refreshToken());
      })
      .catch(error => console.log(error));
}