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

// ---------------------------------------------
//             authenticate client
// ---------------------------------------------
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
   // let localTutorialState = window.localStorage.getItem("musilinks_tutorial");
   // if(localTutorialState === "DONE")
   //    showTutorial = false;

   if (window.innerWidth < 700 ) {
      document.getElementById('search-bar').placeholder = "";
  }

   MicroModal.show("loading-modal");
   await getSpotifyToken();

   MicroModal.close("loading-modal");

   MicroModal.show("main-modal", {
      onClose: onMainModalClose,
      onShow: onMainModalShow
   });
})();

// ---------------------------------------------
//             modal controls
// ---------------------------------------------
function showLoader() {
   MicroModal.show("loading-modal");
}
function closeLoader() {
   MicroModal.close("loading-modal");
   //Displays a little bar on the screen. Don't display it if tutorial was recently displayed.
   if (!helpPopUpDisplayed && !showTutorial) {
      const infoTooltip = document.getElementById("info-container");
      infoTooltip.classList.remove("hidden");
      infoTooltip.classList.add("visible");
      // infoTooltip.style.visibility = "visible";
      setTimeout(function () {
         infoTooltip.classList.remove("visible");
         infoTooltip.classList.add("hidden");
         // infoTooltip.style.visibility = "hidden";
      }, 4000);
      helpPopUpDisplayed = true;
   }
}

const onMainModalClose = () => {
   mainModalOpen = false;
   document
      .getElementById("open-search-btn")
      .classList.remove("quick-hidden");
   document
      .getElementById("open-tutorial-btn")
      .classList.remove("quick-hidden");
   searchBar.value = "";
};

const onMainModalShow = () => {
   mainModalOpen = true;

   document
      .getElementById("open-search-btn")
      .classList.add("quick-hidden");
   document
      .getElementById("open-tutorial-btn")
      .classList.add("quick-hidden");

   if (network) {
      document
         .getElementById("main-modal__overlay")
         .setAttribute("data-micromodal-close", "");
   }

   // if (!tutorialTooltipDisplayed) {
   //    const helpTooltip = document.getElementById("helpTooltip");
   //    setTimeout(function () {
   //       helpTooltip.classList.add("visible");
   //       setTimeout(function () {
   //          helpTooltip.classList.remove("visible");
   //          helpTooltip.classList.add("hidden");
   //          setTimeout(function () {
   //             helpTooltip.classList.remove("hidden");
   //             tutorialTooltipDisplayed = true;
   //          }, 2000);
   //       }, 3200);
   //    }, 1200);
   // }
};

const onHelpModalShow = function () {
   // MicroModal.close("main-modal");
   MicroModal.show("help-modal");
};

const helpIcon = document.getElementById("help-icon");
helpIcon.addEventListener("click", e => onHelpModalShow(e));

// ---------------------------------------------
//               document events
// ---------------------------------------------

// document.onkeypress = function (e) {
//    e = e || window.event;
//    let charCode = typeof e.which == "number" ? e.which : e.keyCode;
//    if (charCode && !mainModalOpen) {
//       MicroModal.show("main-modal", {
//          onClose: onMainModalClose,
//          onShow: onMainModalShow
//       });
//    }
// };

document.onmousemove = function (e) {
   mouseX = e.clientX - bounds.left;
   mouseY = e.clientY - bounds.top;
};

document.addEventListener("DOMContentLoaded", function () {
   document.getElementById("open-search-btn").addEventListener("click", () => {
      MicroModal.show("main-modal", {
         onClose: onMainModalClose,
         onShow: onMainModalShow
      });
   });
   document.getElementById("open-tutorial-btn").addEventListener("click", () => {
      MicroModal.show("tutorial-modal");
   });
});

// ---------------------------------------------
//                autocomplete
// ---------------------------------------------

//Apply event listeners
const searchBar = document.getElementById("search-bar");
var searchInput;
autocomplete(searchBar);

let debouncedSearch = _.debounce(async function () {
   if (searchInput != "") {
      let artistList = await searchMusicBrainzLimited(searchInput);

      let acContainerElmnt = document.createElement("DIV");
      acContainerElmnt.setAttribute("id", searchBar.id + "autocomplete-list");
      acContainerElmnt.setAttribute("class", "autocomplete-items");
      document.getElementById("main-form").appendChild(acContainerElmnt);

      // construct list of artist search results
      for (let i = 0; i < Object.keys(artistList).length; i++) {
         let acItemElmnt = document.createElement("DIV");
         if (artistList[i].description) {
            acItemElmnt.innerHTML =
               artistList[i].name + " - <i>" + artistList[i].description + "</i>";
         } else {
            acItemElmnt.innerHTML = artistList[i].name;
         }
         acItemElmnt.innerHTML +=
            "<input type='hidden' value='" +
            artistList[i].name +
            "' data-artistid='" +
            artistList[i].id +
            "'>";

         // Creates 'add' buttons
         if (network !== null) {
            let acAddBtnElmnt = document.createElement("button");
            acAddBtnElmnt.setAttribute(
               "class",
               "btn btn-success btn-lg  autocomplete-btn"
            );
            acAddBtnElmnt.innerHTML = "+";
            acItemElmnt.appendChild(acAddBtnElmnt);
            // On 'add' button click
            acAddBtnElmnt.addEventListener("click", e => onClickAddItem(e));
         }

         // On search item click
         acItemElmnt.addEventListener("click", e => onClickItem(e));
         acContainerElmnt.appendChild(acItemElmnt);
      }
   }
}, debounceInterval);

function autocomplete(searchBar) {
   let currentFocus;

   // listen for user input in the search bar
   searchBar.addEventListener("input", function (e) {
      searchInput = e.target.value;
      currentFocus = -1;

      closeAllLists();
      let args = [{ searchInput: searchInput }];
      debouncedSearch.bind(searchBar);
      debouncedSearch();
   });

   /*execute a function presses a key on the keyboard:*/
   searchBar.addEventListener("keydown", function (e) {
      // gets the list
      let x = document.getElementById(this.id + "autocomplete-list");
      // if we do have a list...
      if (x) {
         x = x.getElementsByTagName("div");
      }
      if (e.keyCode == 40) {
         /*If the arrow DOWN key is pressed, increase the currentFocus variable:*/
         currentFocus++;
         /*and and make the current item more visible:*/
         addActive(x);
      } else if (e.keyCode == 38) {
         //up
         /*If the arrow UP key is pressed,
             decrease the currentFocus variable:*/
         currentFocus--;
         /*and and make the current item more visible:*/
         addActive(x);
      } else if (e.keyCode == 13) {
         /*If the ENTER key is pressed, prevent the form from being submitted,*/
         e.preventDefault();
         if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
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

   document.addEventListener("click", function (e) {
      closeAllLists(e.target);
   });
}

async function onClickItem(e) {
   e.stopPropagation();

   // Get artistId from clicked autocomplete item
   // Checks if clicked on input tag or div tag
   let artistId;
   if (e.target.tagName.toLowerCase() == "i") {
      artistId = e.target.parentNode
         .getElementsByTagName("input")[0]
         .getAttribute("data-artistid");
   } else {
      artistId = e.target
         .getElementsByTagName("input")[0]
         .getAttribute("data-artistid");
   }

   MicroModal.close("main-modal");

   closeAllLists();
   showLoader();
   let resJSON = await getArtistInfo(artistId);
   closeLoader();
   clearNetwork();
   startNetwork(resJSON);

   if (showTutorial) {
      MicroModal.show("tutorial-modal");
      showTutorial = false;
      window.localStorage.setItem("musilinks_tutorial", "DONE");
   }
}

function closeAllLists() {
   let items = document.getElementsByClassName("autocomplete-items");
   for (let i = 0; i < items.length; i++) {
      items[i].parentNode.removeChild(items[i]);
   }
}

async function onClickAddItem(e) {
   e.stopPropagation();

   closeAllLists();
   MicroModal.close("main-modal");

   let clickedArtistId = e.target.parentNode
      .getElementsByTagName("input")[0]
      .getAttribute("data-artistid");
   let clickedArtistName = e.target.parentNode.getElementsByTagName("input")[0]
      .value;

   // If there is no network (first click user did was on add button)
   if (network == null) {
      // Loading animation
      showLoader();

      let artistData = await getArtistInfo(clickedArtistId);

      closeLoader();
      clearNetwork();
      startNetwork(artistData);
   }

   // There is already a network, let's add a node to it
   else {
      // Search artist on spotify for image
      let spotifySearch = await quickSearchSpotify(clickedArtistName);
      let gnImg = "notfound.jpg";
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
      ghostNodeHolder.setAttribute("width", 320 * network.getScale());
      ghostNodeHolder.setAttribute("height", 320 * network.getScale());
      ghostNodeHolder.src = gnImg;
      ghostNodeHolder.setAttribute("data-artistId", clickedArtistId);
      document.body.appendChild(ghostNodeHolder);

      document.body.addEventListener("mousemove", e => {
         onGhostNodeMousemove(e);
      });
      ghostNodeHolder.addEventListener("click", e => {
         onGhostNodeClick(e);
      });
   }
}

function onGhostNodeMousemove(e) {
   //e.stopPropagation();

   let nodeX = mouseX - parentNodeSize * network.getScale();
   let nodeY = mouseY - parentNodeSize * network.getScale() + bounds.top;

   ghostNodeHolder.style.left = nodeX + "px";
   ghostNodeHolder.style.top = nodeY + "px";
}

async function onGhostNodeClick(e) {
   e.stopPropagation();
   let clickedArtistId = ghostNodeHolder.getAttribute("data-artistId");
   let canvasCoords = network.DOMtoCanvas({ x: mouseX, y: mouseY });
   ghostNodeHolder.parentNode.removeChild(ghostNodeHolder);

   showLoader();
   let artistData = await getArtistInfo(clickedArtistId);
   closeLoader();

   createNode(artistData, canvasCoords.x, canvasCoords.y);
}
