// Musilinks

// ----------- requires -------------
const express = require("express"),
  http = require("http"),
  path = require("path"),
  bodyparser = require("body-parser"),
  fetch = require("node-fetch");

// ----------- main execution -------------

//var token; //  spotify token
//var spotifyGetParams; // GET request configuration for spotify

main();

async function main() {
  // get's authentication token
  //token = await require("./authentication").catch(error => console.log(error));
  //console.log(token);

  // spotifyGetParams = {
  //   method: "GET",
  //   headers: {
  //     Authorization: "Bearer " + token
  //   },
  //   mode: "cors",
  //   cache: "default"
  // };

  const app = express();

  app.set("port", 3000);
  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");
  //app.use(bodyparser.urlencoded({ extended: "true" }));
  app.use(express.static(path.join(__dirname, "public")));

  var jsonParser = bodyparser.json();

  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send("Error caught! Debug this bernardo...");
  });

  app.get("/", function(req, res) {
    res.render("index");
  });

  app.get("/token", async function(req,res){
    let token = await require("./authentication").catch(error => console.log(error));
    res.send(token);
  });

  app.post("/search", jsonParser, async function(req, res) {
    //let search = await searchSpotify(req.body["search-text"]);
    let search = await searchMusicbrainz(req.body["search-text"]);
    res.json(search);
  });

  app.post("/related", jsonParser, async function(req, res) {
    let spotifyId = req.body["artist-spotify-id"];
    let relArtists = await getRelatedArtists(spotifyId);
    let response = {};

    let relLength = relArtists.artists.length;
    for (let i = 0; i < relLength; i++) {
      response[i] = {
        name: relArtists.artists[i].name,
        spotifyId: relArtists.artists[i].id,
        genres: relArtists.artists[i].genres,
        image: "notfound.jpg"
      };
      if (relArtists.artists[i].images.length > 0) {
        response[i].image = relArtists.artists[i].images[0].url;
      }
    }

    res.json(response);
  });

  // Route when user clicks in 'add' button
  app.post("/add", jsonParser, async function(req, res) {
    let artistName = req.body["artist-name"];
    let spotifySearch = await quickSearchSpotify(artistName);
    if (spotifySearch.artists.items.length > 0) {
      let artistSpotifyId = spotifySearch.artists.items[0].id;
      let artistInfo = await getArtistInfo(artistSpotifyId);
      if (artistInfo.images.length > 1) {
        //console.log(artistInfo.images[0].url);
        res.json({ image: artistInfo.images[0].url });
      } else {
        res.json({ image: "notfound.jpg" });
      }
    } else {
      res.json({ image: "notfound.jpg" });
    }
  });

  http.createServer(app).listen(app.get("port"), function() {
    console.log("Server up and running on port " + app.get("port"));
  });
}

//---------------------------
// SPOTIFY API Fetch Functions
//---------------------------
function getRelatedArtists(artistId) {
  let BASE_URL = "https://api.spotify.com/v1/artists/";
  let FETCH_URL = BASE_URL + artistId + "/related-artists";

  return fetch(FETCH_URL, spotifyGetParams)
    .then(function(response) {
      return response.json();
    })
    .then(function(resJSON) {
      return resJSON;
    });
}

function getArtistInfo(artistId) {
  let BASE_URL = "https://api.spotify.com/v1/artists/";
  let FETCH_URL = BASE_URL + artistId;

  return fetch(FETCH_URL, spotifyGetParams).then(function(res) {
    return res.json();
  });
}

function searchSpotify(searchInput) {
  let BASE_URL = "https://api.spotify.com/v1/search?";
  let FETCH_URL =
    BASE_URL + "q=" + encodeURIComponent(searchInput) + "&type=artist";

  let searchResult = {};

  console.log("Search input >> " + searchInput);
  console.log("URI >> " + FETCH_URL);

  return fetch(FETCH_URL, spotifyGetParams)
    .then(function(res) {
      return res.json();
    })
    .then(function(resJSON) {
      //console.log(responseJSON);
      if (resJSON.artists.items.length > 0) {
        let displayLength = resJSON.artists.items.length;
        if (displayLength > 4) {
          displayLength = 5;
        }

        for (let i = 0; i < displayLength; i++) {
          searchResult[i] = {
            name: resJSON.artists.items[i].name,
            id: resJSON.artists.items[i].id
          };
        }
      }
      return searchResult;
    })
    .catch(function(error) {
      console.log(error);
      //reject(error);
    });
}

//----------------------------------
// MUSICBRAINZ API Fetch Functions
//----------------------------------
// function searchMusicbrainz(searchInput) {
//   let BASE_URL = "https://musicbrainz.org/ws/2/";
//   let FETCH_URL =
//     BASE_URL +
//     "artist?query=" +
//     encodeURIComponent(searchInput) +
//     "&limit=5&fmt=json";

//   let mbFetchParams = {
//     method: "GET",
//     header: { "User-Agent": "Musilinks/0.1 (bernardo.knackfuss@gmail.com)" },
//     mode: "cors",
//     cache: "default"
//   };

//   let onMbSearchFetch = function(resJSON) {
//     if (!resJSON.error) {
//       if (resJSON.artists.length > 0) {
//         let displayLength = resJSON.artists.length;
//         displayLength = displayLength > 5 ? 5 : displayLength;

//         for (let i = 0; i < displayLength; i++) {
//           searchResult[i] = {
//             name: resJSON.artists[i].name,
//             id: resJSON.artists[i].id,
//             description: resJSON.artists[i].disambiguation
//           };
//         }
//       }
//       return searchResult;
//     } else {
//       return Promise.reject(resJSON);
//     }
//   };

//   let searchResult = {};

//   return fetch(FETCH_URL, mbFetchParams)
//     .then(function(res) {
//       return res.json();
//     })
//     .then(function(resJSON) {
//       return onMbSearchFetch(resJSON);
//     })
//     .catch(function(error) {
//       console.log(error);
//     });
// }