////////////////////////////////////////////////////////////////////////////////////////
//                                API REQUESTS CODE
////////////////////////////////////////////////////////////////////////////////////////
// @bernardolk - Bernardo Knackfuss 2019 - 2020
////////////////////////////////////////////////////////////////////////////////////////

var getArtistInfo = async function (artistId) {
   // Fetch data from Musicbrainz
   let musicBrainzArtistData = await getMbArtist(artistId);


   const type = musicBrainzArtistData.type;
   const inceptionType = type === "Person" ? "born" : "founded";
   const genres = musicBrainzArtistData.genres ? musicBrainzArtistData.genres.length > 0 ? 
      musicBrainzArtistData.genres.map(genre => genre.name).join(", ") 
      : 'unknown genres': 'unknown genres';
   const area = musicBrainzArtistData.area ? musicBrainzArtistData.area.name ? 
      musicBrainzArtistData.area.name : 'unknown place' : 'unknown place'; 
   const foundedIn = musicBrainzArtistData['life-span'].begin ?
      musicBrainzArtistData['life-span'].begin : 'an unknown date';
   const bio =  `A ${type} from ${area} ${inceptionType} in ${foundedIn} playing ${genres}.`;  

   let response = {
      artist: {
         name: musicBrainzArtistData.name,
         id: musicBrainzArtistData.id,
         type: musicBrainzArtistData.type,
         description: musicBrainzArtistData.disambiguation,
         bio: bio,
         spotifyId: null,
         image: NOT_FOUND_PIC
      },
      relations: []
   };

   if (!musicBrainzArtistData.error) {
      // types of musicbrainz relationships we want to consider
      let relTypes = ["member of band"];
      // if little nodes... put some collaborators too in the mix
      if (musicBrainzArtistData.relations.filter(x => x.type === "member of band").length < 2) {
         relTypes.push("collaboration");
      }

      let idList = [];
      let spotifyPromises = [];

      // filter relationships for the ones we want and remove duplicates
      musicBrainzArtistData.relations.forEach((relation) => {
         if (!idList.includes(relation.artist.id)
            && relTypes.includes(relation.type)) {

            idList.push(relation.artist.id);
            response.relations.push(
               {
                  ...relation.artist,
                  attributes : relation.attributes,
                  formation : {
                     from: relation.begin ? splitPop('-', relation.begin) : '?',
                     to: relation.ended ? relation.end ? splitPop('-', relation.end) : '?' : 'now'
                  },
                  spotify: {
                     image: NOT_FOUND_PIC,
                     id: ""
                  }
               });

            // checks if spotify know's who this artist is.
            spotifyPromises.push(quickSearchSpotify(relation.artist.name));
         }
      });

      // Last promise is dedicated to main artist (important that it is last)
      spotifyPromises.push(quickSearchSpotify(musicBrainzArtistData.name));


      // Waits for all fetchs to conclude
      let spotifySearchData = await Promise.all(spotifyPromises);

      // Extracts SpotifyId and Image when data exists
      let artistSpotifyData = spotifySearchData.map((searchResult, i) => {
         let id = null;
         let image = null;
         if (searchResult.artists.items.length > 0) {
            let artist = searchResult.artists.items[0];
            id = artist.id;
            if (artist.images && artist.images.length > 0) {
               image = artist.images[0].url;
            }
         }
         return { id: id, image: image };
      });

      // Assign data to relations
      response.relations.forEach((relation, i) => {
         let spotifyData = artistSpotifyData[i];
         if (spotifyData.id) {
            relation.spotify.id = spotifyData.id;
         }
         if (spotifyData.image) {
            relation.spotify.image = spotifyData.image;
         }
      });

      // Assign data to main artist
      let mainArtist = artistSpotifyData[artistSpotifyData.length - 1];
      if (mainArtist.id) {
         response.artist.spotifyId = mainArtist.id
      }
      if (mainArtist.image) {
         response.artist.image = mainArtist.image;
      }

      return response;
   } else {
      console.log("Error in fetch from MB server");
   }
};


function getMbArtist(artistId) {
   let BASE_URL = "https://musicbrainz.org/ws/2/";
   let FETCH_URL = BASE_URL + "artist/" + artistId + "?inc=artist-rels+genres&fmt=json";

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
      .then(async function (res) {
         let json = await res.json();
         return onMbSearchFetch(json);
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
      .catch(function (error) {
         console.log(error);
      });
}


/////////////////////////////////////////////////////////////
//             SPOTIFY API Fetch Functions
/////////////////////////////////////////////////////////////
async function getRelatedArtists(artistId) {
   let BASE_URL = "https://api.spotify.com/v1/artists/";
   let FETCH_URL = BASE_URL + artistId + "/related-artists";

   const response = await fetch(FETCH_URL, window.spotifyGetParams);
   const resJSON = await response.json();
   return resJSON;
}

async function getSpotifyArtistInfo(artistId) {
   let BASE_URL = "https://api.spotify.com/v1/artists/";
   let FETCH_URL = BASE_URL + artistId;

   const res = await fetch(FETCH_URL, window.spotifyGetParams);
   return res.json();
}



/////////////////////////////////////////////////////////////
//                        UTILS
/////////////////////////////////////////////////////////////

function splitPop(char, string){
   let splited = string.split(char);
   return splited[0];
}

