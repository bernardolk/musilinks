const debounce = require("lodash.debounce");

// Control variables
var ghostNodeClick = false;
var ghostNodeHolder = null;
var mainModalOpen = false;
const debounceInterval = 500;

// ---------------------------------------------
//             authenticate client
// ---------------------------------------------
var spotifyToken;

getSpotifyToken();
async function getSpotifyToken() {
  spotifyToken = await fetch("/token").then(function(res) {
    MicroModal.show("main-modal");
    return res.text();
  });

  spotifyGetParams = {
    method: "GET",
    headers: {
      Authorization: "Bearer " + spotifyToken
    },
    mode: "cors",
    cache: "default"
  };
}

// ---------------------------------------------
//             modal controls
// ---------------------------------------------

function showLoader() {
  MicroModal.show("loading-modal");
}
function closeLoader() {
  MicroModal.close("loading-modal");
}

const onMainModalClose = function() {
  mainModalOpen = false;
  searchBar.value = "";
};

const onMainModalShow = function() {
  mainModalOpen = true;
};

// ---------------------------------------------
//               document events
// ---------------------------------------------

document.onkeypress = function(e) {
  e = e || window.event;
  let charCode = typeof e.which == "number" ? e.which : e.keyCode;
  if (charCode && !mainModalOpen) {
    MicroModal.show("main-modal", {
      onClose: onMainModalClose,
      onShow: onMainModalShow
    });
  }
};

document.onmousemove = function(e){
  mouseX = e.clientX - bounds.left;
  mouseY = e.clientY - bounds.top;
}

// ---------------------------------------------
//                autocomplete
// ---------------------------------------------

//Apply event listeners
const searchBar = document.getElementById("search-bar");
var searchInput;
autocomplete(searchBar);

let debouncedSearch = debounce(async function() {
  if (searchInput != "") {
    let artistList = await searchArtists(searchInput);

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

      // Creates 'add' button
      let acAddBtnElmnt = document.createElement("button");
      acAddBtnElmnt.setAttribute(
        "class",
        "btn btn-success btn-lg  autocomplete-btn"
      );
      acAddBtnElmnt.innerHTML = "+";
      acItemElmnt.appendChild(acAddBtnElmnt);
      acAddBtnElmnt.addEventListener("click", e => onClickAddItem(e)); // On 'add' button click
      acItemElmnt.addEventListener("click", e => onClickItem(e)); // On search item click
      acContainerElmnt.appendChild(acItemElmnt);
    }
  }
}, debounceInterval);

function autocomplete(searchBar) {
  let currentFocus;


  // listen for user input in the search bar
  searchBar.addEventListener("input", function(e) {
    searchInput = e.target.value;
    currentFocus = -1;

    closeAllLists();
    let args = [{ searchInput: searchInput }];
    debouncedSearch.bind(searchBar);
    debouncedSearch();
  });



  /*execute a function presses a key on the keyboard:*/
  searchBar.addEventListener("keydown", function(e) {
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
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (let i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }

  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function(e) {
    closeAllLists(e.target);
  });
}

async function onClickItem(e) {
  e.stopPropagation();

  // Get artistId from clicked autocomplete item
  // Checks if clicked on input tag or div tag
  let artistId;
  if(e.target.tagName.toLowerCase() == "i"){
    artistId = e.target.parentNode.getElementsByTagName("input")[0].getAttribute("data-artistid");
  }else{
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
    let gnImg = 'notfound.jpg';
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

    document.body.addEventListener("mousemove", e => {onGhostNodeMousemove(e)});
    ghostNodeHolder.addEventListener("click", e => {onGhostNodeClick(e)});
    
  }
}


function onGhostNodeMousemove(e){
  e.stopPropagation();

  let nodeX = mouseX - parentNodeSize * network.getScale();
  let nodeY = mouseY - parentNodeSize * network.getScale() + bounds.top;

  ghostNodeHolder.style.left = nodeX + "px";
  ghostNodeHolder.style.top = nodeY + "px";
}


async function onGhostNodeClick(e){
  e.stopPropagation();
  let clickedArtistId = ghostNodeHolder.getAttribute("data-artistId");
  let canvasCoords = network.DOMtoCanvas({ x: mouseX, y: mouseY });
  ghostNodeHolder.parentNode.removeChild(ghostNodeHolder);

  showLoader();
  let artistData = await getArtistInfo(clickedArtistId);
  closeLoader();

  createNode(artistData, canvasCoords.x, canvasCoords.y);
}
