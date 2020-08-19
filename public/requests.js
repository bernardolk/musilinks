////////////////////////////////////////////////////////////////////////////////////////
//                                API REQUESTS CODE
////////////////////////////////////////////////////////////////////////////////////////
// @bernardolk - Bernardo Knackfuss 2019 - 2020
////////////////////////////////////////////////////////////////////////////////////////

var getArtistInfo = async function (artistId) {
   // console.log("artist ID > " + artistId);
   // Fetch data from Musicbrainz
   let artistData = await getMbArtist(artistId);

   if (!artistData.error) {
      // return object
      let response = {
         relations: [{ spotify: { image: "notfound.jpg", id: "" } }]
      };

      // constructs the relations array of objects, filtering duplicate results
      // (musicbrainz considers two relations for the same band if a member was a member
      // during two distinct periods of time, for instance)
      let relLength = artistData.relations.length;
      let idList = [];
      let relCounter = 0;
      let spotifyPromises = [];
      let artistsSpotifyIds = [];
      let relTypes = ["member of band"];

      // if little nodes... put some collaborators too in the mix
      if (artistData.relations.filter(x => x.type === "member of band").length < 2) {
         relTypes.push("collaboration");
      }

      // scan related artists
      for (let i = 0; i < relLength; i++) {
         if (
            !idList.includes(artistData.relations[i].artist.id) &&
            relTypes.includes(artistData.relations[i].type)
         ) {
            idList.push(artistData.relations[i].artist.id);
            response.relations[relCounter] = artistData.relations[i];
            response.relations[relCounter].spotify = {
               image: "notfound.jpg",
               id: ""
            };

            // checks if spotify know's who this artist is. If yes, get his spotify's id.
            // does only for band members (crew members and session musicians are ignored)
            spotifyPromises.push(
               quickSearchSpotify(artistData.relations[i].artist.name)
            );
            relCounter++;
         }
      }

      // Last promise is dedicated to main artist
      spotifyPromises.push(quickSearchSpotify(artistData.name));

      // Waits for all fetche's to conclude
      let spotifySearchData = await Promise.all(spotifyPromises);

      for (let s = 0; s < spotifySearchData.length - 1; s++) {
         let search = spotifySearchData[s];
         if (search.artists.items.length > 0) {
            response.relations[s].spotify.id = search.artists.items[0].id;
            artistsSpotifyIds.push(search.artists.items[0].id);
         }
      }

      if (
         spotifySearchData[spotifySearchData.length - 1].artists.items.length > 0
      ) {
         response.spotifyId =
            spotifySearchData[spotifySearchData.length - 1].artists.items[0].id;
         artistsSpotifyIds.push(response.spotifyId);
      } else {
         artistsSpotifyIds.push("spotifyIdNotfound");
      }

      if (artistsSpotifyIds.length > 0) {
         let spotifyRoundtrips = Math.ceil(artistsSpotifyIds.length / 50);
         for (let r = 1; r <= spotifyRoundtrips; r++) {
            let fetchCeiling
               = artistsSpotifyIds.length < r * 50 ? artistsSpotifyIds.length : r * 50;
            let artistsToFetch = artistsSpotifyIds.slice((r - 1) * 50, fetchCeiling);
            await getSeveralArtists(artistsToFetch)
               .then((artistsInfo) => {
                  // associate spotify information in the response object.
                  for (let j = 0; j < response.relations.length; j++) {
                     for (let i = 0; i < artistsInfo.artists.length - 1; i++) {
                        if (artistsInfo.artists[i] != null) {
                           if (artistsInfo.artists[i].id == response.relations[j].spotify.id) {
                              if (artistsInfo.artists[i].images.length > 0) {
                                 response.relations[j].spotify.image =
                                    artistsInfo.artists[i].images[0].url;
                              }
                              break;
                           }
                        }
                     }
                  }

                  let mainArtistInfo =
                     artistsInfo.artists[artistsInfo.artists.length - 1];
                  if (mainArtistInfo != null) {
                     if (mainArtistInfo.images.length > 0) {
                        response.image = mainArtistInfo.images[0].url;
                     } else {
                        response.image = "notfound.jpg";
                     }
                  } else {
                     response.image = "notfound.jpg";
                  }
               }
               );
         }
      }

      // Main artist attributes
      response.name = artistData.name;
      response.id = artistData.id;
      response.type = artistData.type;
      response.description = artistData.disambiguation;

      let finalResponse = { artist: {}, relatedArtists: {} };

      // Related artist's data
      let relationsLength = response.relations.length;
      let resCounter = 0;
      for (let i = 0; i < relationsLength; i++) {
         finalResponse.relatedArtists[resCounter] = {
            name: response.relations[i].artist.name,
            id: response.relations[i].artist.id,
            image: response.relations[i].spotify.image,
            spotifyId: response.relations[i].spotify.id
         };
         resCounter++;
      }

      //OMG bad code


      // Main artist's data
      finalResponse.artist = {
         name: response.name,
         id: response.id,
         image: response.image,
         spotifyId: response.spotifyId
      };

      return finalResponse;
   } else {
      console.log("Error in fetch from MB server");
   }
};


function getMbArtist(artistId) {
   let BASE_URL = "https://musicbrainz.org/ws/2/";
   let FETCH_URL = BASE_URL + "artist/" + artistId + "?inc=artist-rels&fmt=json";

   let mbFetchParams = {
      method: "GET",
      header: { "User-Agent": "Musilinks/0.1 (bernardo.knackfuss@gmail.com)" },
      mode: "cors",
      cache: "default"
   };

   return (
      fetch(FETCH_URL, mbFetchParams)
         .then(function (res) {
            return res.json();
         })
         // .then(function(resJSON) {
         //   return onMbGetArtistFetch(resJSON);
         // })
         .catch(function (error) {
            console.log(error);
            return { error: "something bad occured." };
         })
   );
}

function quickSearchSpotify(artistName) {
   let BASE_URL = "https://api.spotify.com/v1/search?";
   let FETCH_URL =
      BASE_URL + 'q="' + encodeURIComponent(artistName) + '"&type=artist&limit=1';

   return fetch(FETCH_URL, spotifyGetParams)
      .then(function (res) {
         return res.json();
      });
}

function getSeveralArtists(artistsIds) {
   let BASE_URL = "https://api.spotify.com/v1/artists?ids=";
   let FETCH_URL = BASE_URL;
   artistsIds.forEach(function (element, index, array) {
      FETCH_URL += encodeURIComponent(element);
      if (index !== array.length - 1) {
         FETCH_URL += ",";
      }
   });

   return fetch(FETCH_URL, window.spotifyGetParams).then(function (res) {
      return res.json();
   });
}


async function searchMusicBrainzLimited(searchInput) {
   let BASE_URL = "https://musicbrainz.org/ws/2/";
   let FETCH_URL =
      BASE_URL +
      "artist?query=" +
      encodeURIComponent(searchInput) +
      "&limit=5&fmt=json";

   let mbFetchParams = {
      method: "GET",
      header: { "User-Agent": "Musilinks/0.1 (bernardo.knackfuss@gmail.com)" },
      mode: "cors",
      cache: "default"
   };

   let searchResult = {};

   let onMbSearchFetch = function (resJSON) {
      if (!resJSON.error) {
         if (resJSON.artists.length > 0) {
            let displayLength = resJSON.artists.length;
            displayLength = displayLength > 5 ? 5 : displayLength;

            for (let i = 0; i < displayLength; i++) {
               searchResult[i] = {
                  name: resJSON.artists[i].name,
                  id: resJSON.artists[i].id,
                  description: resJSON.artists[i].disambiguation
               };
            }
         }
         return searchResult;
      } else {
         return Promise.reject(resJSON);
      }
   };

   return fetch(FETCH_URL, mbFetchParams)
      .then(function (res) {
         return res.json();
      })
      .then(function (resJSON) {
         return onMbSearchFetch(resJSON);
      })
      .catch(function (error) {
         console.log(error);
      });

}

function searchMusicBrainz(query, limit) {
   let FETCH_URL =
      'https://musicbrainz.org/ws/2/artist?query=artist:'
      + query + '&limit=' + limit + '&fmt=json';


   let mbFetchParams = {
      method: "GET",
      header: { "User-Agent": "Musilinks/0.1 (bernardo.knackfuss@gmail.com)" },
      mode: "cors",
      cache: "default"
   };

   return fetch(FETCH_URL, mbFetchParams)
      .then(function (res) {
         return res.json();
      })
      .then(function (resJSON) {
         return resJSON;
      })
      .catch(function (error) {
         console.log(error);
      });
}


//-----------------------------
// SPOTIFY API Fetch Functions
//-----------------------------
function getRelatedArtists(artistId) {
   let BASE_URL = "https://api.spotify.com/v1/artists/";
   let FETCH_URL = BASE_URL + artistId + "/related-artists";

   return fetch(FETCH_URL, window.spotifyGetParams)
      .then(function (response) {
         return response.json();
      })
      .then(function (resJSON) {
         return resJSON;
      });
}

function getSpotifyArtistInfo(artistId) {
   let BASE_URL = "https://api.spotify.com/v1/artists/";
   let FETCH_URL = BASE_URL + artistId;

   return fetch(FETCH_URL, window.spotifyGetParams).then(function (res) {
      return res.json();
   });
}


