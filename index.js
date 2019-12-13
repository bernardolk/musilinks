// Musilinks

// ----------- requires -------------
const express = require("express"),
  http = require("http"),
  path = require("path"),
  bodyparser = require("body-parser"),
  fetch = require("node-fetch"),
  mb = require("musicbrainz");

// ----------- main execution -------------

var token; //  spotify token
var spotifyGetParams; // GET request configuration for spotify

main();

async function main() {
  // get's authentication token
  token = await require("./authentication").catch(error => console.log(error));
  //console.log(token);

  spotifyGetParams = {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    },
    mode: "cors",
    cache: "default"
  };

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

  app.post("/search", jsonParser, async function(req, res) {
    //let search = await searchSpotify(req.body["search-text"]);
    let search = await searchMusicbrainz(req.body["search-text"]);
    res.json(search);
  });

  app.post("/show", jsonParser, async function(req, res) {
    let artistId = req.body["artist-id"];
    let response = { artist: {}, relatedArtists: {} };

    // Related artist fetch method
    //let artistInfo = await getArtistInfo(artistId);
    //let relatedArtists = await getRelatedArtists(artistId);
    // let relArtLen = relatedArtists.artists.length;
    // for (let i = 0; i < relArtLen; i++) {
    //   if(relatedArtists.artists[i].images.length > 0){
    //   response.relatedArtists[i] = {
    //     name: relatedArtists.artists[i].name,
    //     id: relatedArtists.artists[i].id,
    //     image: relatedArtists.artists[i].images[0].url
    //   };
    // }else{
    //   // if artist does not have an image
    //   response.relatedArtists[i] = {
    //     name: relatedArtists.artists[i].name,
    //     id: relatedArtists.artists[i].id,
    //     image: 'notfound.jpg'
    //   };
    // }
    // }
    // if(artistInfo.images.length > 0){
    // response.artist = { name: artistInfo.name, id: artistInfo.id, image: artistInfo.images[0].url};
    // }
    // else{
    //   response.artist = { name: artistInfo.name, id: artistInfo.id, image: 'notfound.jpg'};
    // }

    // Fetch data from Musicbrainz
    console.time('getMbArtist');
    let data = await getMbArtist(artistId);
    console.timeEnd('getMbArtist');

    // Related artist's data
    let relationsLength = data.relations.length;
    let resCounter = 0;
    for (let i = 0; i < relationsLength; i++) {
      if (data.relations[i].type == "member of band") {
        response.relatedArtists[resCounter] = {
          name: data.relations[i].artist.name,
          id: data.relations[i].artist.id,
          image: data.relations[i].spotify.image,
          spotifyId: data.relations[i].spotify.id
        };
        resCounter++;
      }
    }

    // Main artist's data
    response.artist = {
      name: data.name,
      id: data.id,
      image: data.image,
      spotifyId: data.spotifyId
    };
    res.json(response);
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
        image: ""
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
    console.time('quickSearchSpotify');
    let spotifySearch = await quickSearchSpotify(artistName);
    console.timeEnd('quickSearchSpotify');
    if (spotifySearch.artists.items.length > 0) {
      let artistSpotifyId = spotifySearch.artists.items[0].id;
      console.time('getArtistInfo');
      let artistInfo = await getArtistInfo(artistSpotifyId);
      console.timeEnd('getArtistInfo');
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

function quickSearchSpotify(artistName) {
  let BASE_URL = "https://api.spotify.com/v1/search?";
  let FETCH_URL =
    BASE_URL + 'q="' + encodeURIComponent(artistName) + '"&type=artist&limit=1';

  return fetch(FETCH_URL, spotifyGetParams).then(function(res) {
    return res.json();
  });
}

function getSeveralArtists(artistsIds) {
  let BASE_URL = "https://api.spotify.com/v1/artists?ids=";
  let FETCH_URL = BASE_URL;
  artistsIds.forEach(function(element, index, array) {
    FETCH_URL += encodeURIComponent(element);
    if (index !== array.length - 1) {
      FETCH_URL += ",";
    }
  });

  //console.log("FETCH URL   " + FETCH_URL);

  return fetch(FETCH_URL, spotifyGetParams).then(function(res) {
    return res.json();
  });
}

//----------------------------------
// MUSICBRAINZ API Fetch Functions
//----------------------------------
function searchMusicbrainz(searchInput) {
  let BASE_URL = "https://musicbrainz.org/ws/2/";
  let FETCH_URL =
    BASE_URL +
    "artist?query=" +
    encodeURIComponent(searchInput) +
    "&limit=5&fmt=json";

  let mbFetchParams = {
    method: "GET",
    mode: "cors",
    cache: "default"
  };

  let searchResult = {};

  // console.log("Search input >> " + searchInput);
  // console.log("URI >> " + FETCH_URL);

  return fetch(FETCH_URL, mbFetchParams)
    .then(function(res) {
      return res.json();
    })
    .then(function(resJSON) {
      //console.log(resJSON);
      if (resJSON.artists.length > 0) {
        let displayLength = resJSON.artists.length;
        if (displayLength > 5) {
          displayLength = 5;
        }

        for (let i = 0; i < displayLength; i++) {
          searchResult[i] = {
            name: resJSON.artists[i].name,
            id: resJSON.artists[i].id,
            description: resJSON.artists[i].disambiguation
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

function getMbArtist(artistId) {
  let BASE_URL = "https://musicbrainz.org/ws/2/";
  let FETCH_URL = BASE_URL + "artist/" + artistId + "?inc=artist-rels&fmt=json";

  let mbFetchParams = {
    method: "GET",
    mode: "cors",
    cache: "default"
  };


  console.time('getMbFetch');
  return fetch(FETCH_URL, mbFetchParams)
    .then(function(res) {
      return res.json();
    })
    .then(async function(resJSON) {
      // return object
      console.timeEnd('getMbFetch');
      let response = {
        relations: [{ spotify: { image: "notfound.jpg", id: "" } }]
      };

      // for (let kk = 0; kk < Object.keys(resJSON.relations).length; kk++) {
      //   console.log("type: " + resJSON.relations[kk].type);
      //   console.log(resJSON.relations[kk].artist);
      // }

      // constructs the relations array of objects, filtering duplicate results
      // (musicbrainz considers two relations for the same band if a member was a member
      // during two distinct periods of time, for instance)
      let relLength = resJSON.relations.length;
      let idList = [];
      let relCounter = 0;
      // let sIdsCounter = 0;
      let artistsSpotifyIds = [];

      let spotifyPromises = [];

      // scan related artists
      for (let i = 0; i < relLength; i++) {
        if (
          !idList.includes(resJSON.relations[i].artist.id) &&
          resJSON.relations[i].type == "member of band"
        ) {
          idList.push(resJSON.relations[i].artist.id);
          response.relations[relCounter] = resJSON.relations[i];
          response.relations[relCounter].spotify = {
            image: "notfound.jpg",
            id: ""
          };

          // checks if spotify know's who this artist is. If yes, get his spotify's id.
          // does only for band members (crew members and session musicians are ignored)
          // spotify fetch
          console.log('artist #' + i);
          console.time('quick-search-spotify');              
          // let search = await quickSearchSpotify(
          //   resJSON.relations[i].artist.name
          // );
          spotifyPromises.push(quickSearchSpotify(resJSON.relations[i].artist.name));
          console.timeEnd('quick-search-spotify');
          relCounter++;
        }
      }

      spotifyPromises.push(quickSearchSpotify(resJSON.name));

      let finalres = await Promise.all(spotifyPromises).then(async function(values){
        
        for(let s = 0; s < values.length - 1; s++){
          let search = values[s];
        if (search.artists.items.length > 0) {
          response.relations[s].spotify.id =
            search.artists.items[0].id;
          artistsSpotifyIds.push(search.artists.items[0].id);
        }
      }


      if (values[values.length - 1].artists.items.length > 0) {
        response.spotifyId = values[values.length - 1].artists.items[0].id;
        artistsSpotifyIds.push(response.spotifyId);
      }
      else{
        push('spotifyIdNotfound');
      }


      console.time('get-several-artists');
      // get artist image for all identified artists.
      if (artistsSpotifyIds.length > 0) {
        //console.log("INPUT  " + artistsSpotifyIds);

        let artistsInfo = await getSeveralArtists(artistsSpotifyIds);
        //console.log(artistsInfo);

        // associate spotify information in the response object.
        for (let j = 0; j < response.relations.length; j++) {
          for (let i = 0; i < artistsInfo.artists.length - 1; i++) {
            if (artistsInfo.artists[i].id == response.relations[j].spotify.id) {
              if (artistsInfo.artists[i].images.length > 0) {
                response.relations[j].spotify.image =
                  artistsInfo.artists[i].images[0].url;
              }
              break;
            }
          }
        }

        let mainArtistInfo = artistsInfo.artists[artistsInfo.artists.length - 1];
        if(mainArtistInfo.images.length > 0){
          response.image = mainArtistInfo.images[0].url;
        }
        else{
          response.image = 'notfound.jpg';
        }

      }

    
      console.timeEnd('get-several-artists');

      // Main artist attributes
      response.name = resJSON.name;
      response.id = resJSON.id;
      response.type = resJSON.type;
      response.description = resJSON.disambiguation;

      return response;
      });

      return finalres;
    });
}
