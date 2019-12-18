const debounce = require("lodash.debounce");

// Control variables
var ghostNodeClick = false;
var ghostNodeHolder = null;
var mainModalOpen = false;

// ---------------------------------------------
//             authenticate client
// ---------------------------------------------
var spotifyToken;

getSpotifyToken();
async function getSpotifyToken() {
  spotifyToken = await fetch("/token").then(function(res) {
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

MicroModal.show("main-modal");

function showLoader() {MicroModal.show("loading-modal");}
function closeLoader() {MicroModal.close("loading-modal");}


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


document.body.addEventListener("mousemove", function(e) {
  mouseX = e.clientX - bounds.left;
  mouseY = e.clientY - bounds.top;

  if (ghostNodeHolder != null) {
    let nodeX = mouseX - parentNodeSize * network.getScale();
    let nodeY = mouseY - parentNodeSize * network.getScale() + bounds.top;

    ghostNodeHolder.style.left = nodeX + "px";
    ghostNodeHolder.style.top = nodeY + "px";

    let ghostNodeClickHandler = function(e) {
      ghostNodeClick = true;
    };

    ghostNodeHolder.addEventListener("click", ghostNodeClickHandler);

    if (ghostNodeClick) {
      let clickedArtistId = ghostNodeHolder.getAttribute("data-artistId");
      let canvasCoords = network.DOMtoCanvas({ x: mouseX, y: mouseY });
      ghostNodeHolder.parentNode.removeChild(ghostNodeHolder);

      showLoader();

      document.body.removeEventListener("click", ghostNodeClickHandler);

      ghostNodeClick = false;
      ghostNodeHolder = null;
    }
  }
});

// ---------------------------------------------
//                autocomplete
// ---------------------------------------------

//Apply event listeners
const searchBar = document.getElementById("search-bar");
var searchInput;
autocomplete(searchBar);

let debouncedSearch = 
    debounce(async function() {    
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
        acAddBtnElmnt.setAttribute("class", "btn btn-success btn-lg  autocomplete-btn");
        acAddBtnElmnt.innerHTML = "+";
        acItemElmnt.appendChild(acAddBtnElmnt);
        acAddBtnElmnt.addEventListener("click", e => onClickAddItem(e));  // On 'add' button click  
        acItemElmnt.addEventListener("click", e => onClickItem(e)); // On search item click
        acContainerElmnt.appendChild(acItemElmnt);
      }
    }, 900);

function autocomplete(searchBar) {
  let currentFocus;

  // listen for user input in the search bar
  searchBar.addEventListener("input", function(e) {
    searchInput = e.target.value;
    currentFocus = -1;

    closeAllLists();
    console.log("you are typing");
    let args = [{'searchInput' : searchInput}];
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
  console.log("Network restarting...");
  let artistId = e.target
    .getElementsByTagName("input")[0]
    .getAttribute("data-artistid");

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

  let clickedArtistId = this.parentNode
    .getElementsByTagName("input")[0]
    .getAttribute("data-artistid");
  let clickedArtistName = this.parentNode.getElementsByTagName("input")[0]
    .value;

  // Get artist image from spotify to render node
  if (network == null) {
    // Loading animation
    showLoader();

    console.time("show");
    fetch("/show", params)
      .then(function(response) {
        return response.json();
      })
      .then(function(resJson) {
        console.time("show");
        // deletes the network and restarts it with the newly selected artist's data
        console.time("render");
        closeLoader();
        clearNetwork();
        startNetwork(resJson);
        console.time("render");
      });
  } else {
    // Pass selected artist information to server to render node
    // let params = {
    //   method: "POST",
    //   headers: {
    //     "content-type": "application/json"
    //   },
    //   body: JSON.stringify({
    //     "artist-id": clickedArtistId,
    //     "artist-name": clickedArtistName
    //   })
    // };

    fetch("/add", params)
      .then(function(res) {
        return res.json();
      })
      .then(function(resJSON) {
        ghostNodeHolder = document.createElement("img");
        ghostNodeHolder.setAttribute("id", "ghostNode");
        ghostNodeHolder.setAttribute("class", "ghost-node rounded-circle");
        ghostNodeHolder.setAttribute("width", 320 * network.getScale());
        ghostNodeHolder.setAttribute("height", 320 * network.getScale());
        ghostNodeHolder.src = resJSON["image"];
        ghostNodeHolder.setAttribute("data-artistId", clickedArtistId);
        document.body.appendChild(ghostNodeHolder);
      });
  }
}
