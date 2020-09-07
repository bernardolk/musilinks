////////////////////////////////////////////////////////////////////////////////////////
//                               GENERAL APP EVENTS CODE
////////////////////////////////////////////////////////////////////////////////////////
// @bernardolk - Bernardo Knackfuss 2019 - 2020
////////////////////////////////////////////////////////////////////////////////////////
// Control variables
var ghostNodeClick = false;
var ghostNodeHolder = null;
var mainModalOpen = false;
const debounceInterval = 500;
var tutorialTooltipDisplayed = false;
var helpPopUpDisplayed = false;
var networkElement = document.getElementById("network-canvas");
var bounds = networkElement.getBoundingClientRect();
var showTutorial = true;
var searchMode = 'CREATE';
var noRelatedArtists = false;

const MIN_WINDOW_WIDTH_FOR_FIVE_ARTISTS = 700;
const REL_ARTISTS_ROWS = window.innerWidth < MIN_WINDOW_WIDTH_FOR_FIVE_ARTISTS ? 5 : 4;
const REL_ARTISTS_PER_ROW = window.innerWidth < MIN_WINDOW_WIDTH_FOR_FIVE_ARTISTS ? 4 : 5;
const NOT_FOUND_PIC = "notfound.png";
const MAX_WINDOW_WIDTH_FOR_SEARCHBAR_TEXT = 700;

///////////////////////////////////////////////////
//             GET SPOTIFY API TOKEN
///////////////////////////////////////////////////
var spotifyToken = null;
var tokenExpiration = null;


async function getSpotifyToken() {
   // ({ token: spotifyToken, expiration: tokenExpiration } = await fetch("/token")
   let tokenObj = await fetch("/token")
      .then(function (res) {
         return res.json();
      });

   window.spotifyGetParams = {
      method: "GET",
      headers: {
         Authorization: "Bearer " + tokenObj.token
      },
      mode: "cors",
      cache: "default"
   };
   spotifyToken = tokenObj.token;
   tokenExpiration = tokenObj.expiration;

   countdown(tokenExpiration)
      .then(async () => await getSpotifyToken());
}

function countdown(expiration) {
   return new Promise((resolve) => {
      tokenExpiration = expiration;
      let timer = setInterval(() => tokenExpiration = tokenExpiration - 1, 1000);
      let loop = () => {
         if (tokenExpiration > 0) {
            setTimeout(loop, 0);
         }
         else {
            clearInterval(timer);
            resolve('ok');
         }
      }
      loop();
   });
}

//////////////////////////////////////////////////////////////
//                     MAIN EXECUTION
//////////////////////////////////////////////////////////////
(async function main() {
   if (window.innerWidth < MAX_WINDOW_WIDTH_FOR_SEARCHBAR_TEXT) {
      document.getElementById('search-bar').placeholder = "";
   }

   let spotifyRelArtistElement = document.getElementById("node-modal-related");
   let zIndex = 900;

   for (let i = 0; i < REL_ARTISTS_ROWS; i++) {
      let newRow = document.createElement("div");
      newRow.setAttribute("id", "related-artist-row-" + i);
      newRow.setAttribute("class", "related-artist-row");
      newRow.style.zIndex = zIndex;
      zIndex -= 1;
      spotifyRelArtistElement.appendChild(newRow);

      for (let j = 0; j < REL_ARTISTS_PER_ROW; j++) {
         let imgContainer = document.createElement("div");
         imgContainer.setAttribute("id", `rel-artist-img-container-${i}-${j}`);
         imgContainer.setAttribute("class", "related-artist-image-div");

         let relArtImg = document.createElement("img");
         relArtImg.setAttribute("id", `rel-artist-img-${i}-${j}`);
         relArtImg.setAttribute("class", "rounded-circle related-artist-image");

         imgContainer.appendChild(relArtImg);
         newRow.appendChild(imgContainer);
      }
   }

   MicroModal.show("loading-modal");
   await getSpotifyToken();
   MicroModal.close("loading-modal");

   MicroModal.show("main-modal", {
      onClose: onMainModalClose,
      onShow: onMainModalShow
   });
})();

////////////////////////////////////////////////
//                MODAL CONTROLS
////////////////////////////////////////////////
function showLoader() {
   MicroModal.show("loading-modal");
}


function displayTooltip() {
   const infoTooltip = document.getElementById("info-container");
   infoTooltip.classList.remove("hidden");
   infoTooltip.classList.add("visible");
   setTimeout(function () {
      infoTooltip.classList.remove("visible");
      infoTooltip.classList.add("hidden");
   }, 5000);
}


function closeLoader() {
   MicroModal.close("loading-modal");
}

const onMainModalClose = () => {
   mainModalOpen = false;
   closeAllLists();
   searchBar.value = "";
   if (!showTutorial) {
      displayBtns();
   }
};


const displayBtns = () => {
   document
      .getElementById("open-search-btn")
      .classList.remove("quick-hidden");
   document
      .getElementById("open-tutorial-btn")
      .classList.remove("quick-hidden");
   document
      .getElementById("add-artist-btn")
      .classList.remove("quick-hidden");
}

const hideBtns = () => {
   document
      .getElementById("open-search-btn")
      .classList.add("quick-hidden");
   document
      .getElementById("open-tutorial-btn")
      .classList.add("quick-hidden");
   document
      .getElementById("add-artist-btn")
      .classList.add("quick-hidden");
}


const onMainModalShow = () => {
   mainModalOpen = true;
   closeAllLists();
   hideBtns();

   if (Network) {
      document
         .getElementById("main-modal__overlay")
         .setAttribute("data-micromodal-close", "");
   }
};

const onClickHelp = function () {
   MicroModal.close("main-modal");
   MicroModal.show("help-modal", {
      onShow: () => hideBtns(),
      onClose: () => MicroModal.show("main-modal")
   });
};


function onHelpModalClose() {
   MicroModal.show("main-modal");
}

const helpIcon = document.getElementById("help-icon");
helpIcon.addEventListener("click", e => onClickHelp(e));

/////////////////////////////////////////////////////////
//                   DOCUMENT EVENTS
/////////////////////////////////////////////////////////
document.onmousemove = function (e) {
   MouseX = e.clientX - bounds.left;
   MouseY = e.clientY - bounds.top;
};

document.addEventListener("DOMContentLoaded", () => {
   document.getElementById("open-search-btn").addEventListener("click", () => {
      searchMode = 'CREATE';
      MicroModal.show("main-modal", {
         onClose: onMainModalClose,
         onShow: onMainModalShow
      });
   });
   document.getElementById("open-tutorial-btn").addEventListener("click", () => {
      MicroModal.show("tutorial-modal", {
         onClose: displayBtns
      });
      hideBtns();
   });
   document.getElementById("add-artist-btn").addEventListener("click", () => {
      searchMode = 'ADD';
      MicroModal.show("main-modal", {
         onClose: onMainModalClose,
         onShow: onMainModalShow
      });
   });
});

///////////////////////////////////////////////////////////////
//                         AUTOCOMPLETE
///////////////////////////////////////////////////////////////
const searchBar = document.getElementById("search-bar");
var searchInput;
autocomplete(searchBar);

let debouncedSearch = _.debounce(async () => {
   if (searchInput != "") {
      let artistList = await searchMusicBrainzLimited(searchInput);

      let acContainerElmnt = document.createElement("DIV");
      acContainerElmnt.setAttribute("id", searchBar.id + "autocomplete-list");
      acContainerElmnt.setAttribute("class", "autocomplete-items");

      // construct list of artist search results
      for (let i = 0; i < Object.keys(artistList).length; i++) {
         let itemDivElement = document.createElement("DIV");

         if (artistList[i].description) {
            itemDivElement.innerHTML =
               `${artistList[i].name} - <i>${artistList[i].description}</i>`;
         }
         else {
            itemDivElement.innerHTML = artistList[i].name;
         }

         let itemInputElement = document.createElement("INPUT");
         itemInputElement.setAttribute("data-artistid", artistList[i].id);
         itemInputElement.setAttribute("data-artistname", artistList[i].name);
         itemInputElement.setAttribute("type", "hidden");
         itemDivElement.appendChild(itemInputElement);

         // On search item click
         if (searchMode === 'CREATE') {
            itemDivElement.addEventListener("click", e => onClickItem(e));
         }
         else if (searchMode === 'ADD') {
            itemDivElement.addEventListener("click", e => onClickAddItem(e));
         }
         else {
            console.log('searchMode is in an invalid state. Check where this variable is set.');
         }
         acContainerElmnt.appendChild(itemDivElement);
      }
      document.getElementById("main-form").appendChild(acContainerElmnt);
   }
}, debounceInterval);

function autocomplete(searchBar) {
   let currentFocus;

   searchBar.addEventListener("input", function (e) {
      searchInput = e.target.value;
      currentFocus = -1;
      closeAllLists();
      debouncedSearch.bind(searchBar);
      debouncedSearch();
   });

   searchBar.addEventListener("keydown", function (e) {
      let x = document.getElementById(this.id + "autocomplete-list");
      if (x) {
         x = x.getElementsByTagName("div");
      }
      if (e.keyCode == 40) {
         currentFocus++;
         addActive(x);
      } else if (e.keyCode == 38) {
         currentFocus--;
         addActive(x);
      } else if (e.keyCode == 13) {
         e.preventDefault();
         if (currentFocus > -1) {
            if (x) x[currentFocus].click();
         }
      }
   });

   function addActive(x) {
      if (!x) return false;
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = x.length - 1;
      x[currentFocus].classList.add("autocomplete-active");
   }
   function removeActive(x) {
      for (let i = 0; i < x.length; i++) {
         x[i].classList.remove("autocomplete-active");
      }
   }

}



///////////////////////////////////////////
//    ON CLICK ARTIST NAME AUTOCOMPLETE
///////////////////////////////////////////
async function onClickItem(e) {
   e.stopPropagation();

   let artistId = e.target
      .getElementsByTagName("input")[0]
      .getAttribute("data-artistid");


   MicroModal.close("main-modal");

   showLoader();
   let resJSON = await getArtistInfo(artistId);
   closeLoader();

   noRelatedArtists = Object.keys(resJSON.relations).length === 0 ? true : false;

   if (showTutorial) {
      MicroModal.show("tutorial-modal", {
         onClose: () => {
            if (noRelatedArtists)
               displayTooltip();
            displayBtns();
         }
      });
      showTutorial = false;
      window.localStorage.setItem("musilinks_tutorial", "DONE");
   }
   else if (noRelatedArtists) {
      displayTooltip();
      noRelatedArtists = false;
      displayBtns();
   }
   else {
      displayBtns();
   }

   clearNetwork();
   startNetwork(resJSON);
}

function closeAllLists() {
   let items = document.getElementsByClassName("autocomplete-items");
   for (let i = 0; i < items.length; i++) {
      items[i].parentNode.removeChild(items[i]);
   }
}

///////////////////////////////////////
//    ON ADD NODE BUTTON CLICK
///////////////////////////////////////
async function onClickAddItem(e) {
   e.stopPropagation();

   let inputElement = e.target.getElementsByTagName("input")[0];
   let clickedArtistId = inputElement.getAttribute("data-artistid");
   let clickedArtistName = inputElement.getAttribute("data-artistname");

   MicroModal.close("main-modal");
   showLoader();

   // Search artist on spotify for image
   let spotifySearch = await quickSearchSpotify(clickedArtistName);
   let gnImg = NOT_FOUND_PIC;
   if (spotifySearch.artists.items.length > 0) {
      let artistSpotifyId = spotifySearch.artists.items[0].id;
      let artistInfo = await getSpotifyArtistInfo(artistSpotifyId);

      if (artistInfo.images.length > 1) {
         gnImg = artistInfo.images[0].url;
      }
   }

   // Creates 'ghost node' that follows mouse movement
   // The size of the node scales according to the current zoom (scale)
   // of the network
   ghostNodeHolder = document.createElement("img");
   ghostNodeHolder.setAttribute("id", "ghostNode");
   ghostNodeHolder.setAttribute("class", "ghost-node rounded-circle");
   ghostNodeHolder.setAttribute("width", 320 * Network.getScale());
   ghostNodeHolder.setAttribute("height", 320 * Network.getScale());
   ghostNodeHolder.src = gnImg;
   ghostNodeHolder.setAttribute("data-artistId", clickedArtistId);
   document.body.appendChild(ghostNodeHolder);

   document.body.addEventListener("mousemove", e => {
      onGhostNodeMousemove(e);
   });
   ghostNodeHolder.addEventListener("click", e => {
      onGhostNodeClick(e);
   });

   closeLoader();
   displayBtns();
}

function onGhostNodeMousemove(e) {
   //e.stopPropagation();

   let nodeX = MouseX - parentNodeSize * Network.getScale();
   let nodeY = MouseY - parentNodeSize * Network.getScale() + bounds.top;

   ghostNodeHolder.style.left = nodeX + "px";
   ghostNodeHolder.style.top = nodeY + "px";
}

async function onGhostNodeClick(e) {
   e.stopPropagation();
   let clickedArtistId = ghostNodeHolder.getAttribute("data-artistId");
   let canvasCoords = Network.DOMtoCanvas({ x: MouseX, y: MouseY });
   ghostNodeHolder.parentNode.removeChild(ghostNodeHolder);

   showLoader();
   let artistData = await getArtistInfo(clickedArtistId);
   closeLoader();

   createNode(artistData, canvasCoords.x, canvasCoords.y);
}
