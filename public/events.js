var ghostNodeClick = false;
var ghostNodeHolder = null;

var mainModalOpen = false;
var searchInputElement = document.getElementById("search-bar-text");

MicroModal.show("main-modal");

//MicroModal.show('loading-modal');

function showLoader() {
  MicroModal.show("loading-modal");
}

function closeLoader() {
  MicroModal.close("loading-modal");
}

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

// document.onkeydown = function(e) {
//   e = e || window.event;
//   let keyCode = e.keyCode;
//   if (keyCode == 8) {
//     console.log("yay");
//     keyInput = keyInput.slice(0, -1);
//     //console.log(keyInput);
//     searchInputElement.value = keyInput;
//   }
// };

const onMainModalClose = function() {
  mainModalOpen = false;
  searchBar.value = "";
};

const onMainModalShow = function() {
  mainModalOpen = true;
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

      let params = {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ "artist-id": clickedArtistId })
      };

      document.body.removeEventListener("click", ghostNodeClickHandler);

      ghostNodeClick = false;
      ghostNodeHolder = null;
    
      fetch("/show", params)
        .then(function(response) {
          return response.json();
        })
        .then(function(resJSON) {
          closeLoader();
          createNode(resJSON, canvasCoords.x, canvasCoords.y);
        });
    }
  }
});

// ------------ SEARCH BAR ---------------- //

const searchBar = document.getElementById("search-bar");
autocomplete(searchBar);

//var showSearchItems = true;
var currentInput;

function autocomplete(inp) {
  let currentFocus;

  // listen for user input in the search bar
  inp.addEventListener("input", function(e) {
    let a, b, i; // Input tags value:
    let inputVal = e.target.value;
    currentInput = inputVal;

    closeAllLists();

    currentFocus = -1;

    // checks to see if this call is outdated based on current user input
    if (currentInput === inputVal) {
      let fetchParams = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ "search-text": inputVal })
      };

      fetch("/search", fetchParams)
        .then(response => {
          return response.json();
        })
        .then(artists => {
          let jsonLength = Object.keys(artists).length;

          // only display results if we have a valid response AND
          // the current value of the input is equal to the input we
          // are calculating (this avoids problems with assynchronous calls)
          if (jsonLength > 0 && inputVal === currentInput) {
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            document.getElementById("main-form").appendChild(a);

            for (i = 0; i < jsonLength; i++) {
              b = document.createElement("DIV");
              if (artists[i].description) {
                b.innerHTML =
                  artists[i].name + " - <i>" + artists[i].description + "</i>";
              } else {
                b.innerHTML = artists[i].name;
              }
              b.innerHTML +=
                "<input type='hidden' value='" +
                artists[i].name +
                "' data-artistid='" +
                artists[i].id +
                "'>";

              // Creates 'add' button
              c = document.createElement("button");
              c.setAttribute(
                "class",
                "btn btn-success btn-lg  autocomplete-btn"
              );
              c.innerHTML = "+";
              b.appendChild(c);

              // On 'add' button click
              c.addEventListener("click", function(e) {
                e.stopPropagation();

                closeAllLists();

                MicroModal.close("main-modal");

                let clickedArtistId = this.parentNode
                  .getElementsByTagName("input")[0]
                  .getAttribute("data-artistid");
                let clickedArtistName = this.parentNode.getElementsByTagName(
                  "input"
                )[0].value;

                // Get artist image from spotify to render node
                if (network == null) {
                  let params = {
                    method: "POST",
                    headers: {
                      "content-type": "application/json"
                    },
                    body: JSON.stringify({ "artist-id": clickedArtistId })
                  };

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
                  let params = {
                    method: "POST",
                    headers: {
                      "content-type": "application/json"
                    },
                    body: JSON.stringify({
                      "artist-id": clickedArtistId,
                      "artist-name": clickedArtistName
                    })
                  };

                  fetch("/add", params)
                    .then(function(res) {
                      return res.json();
                    })
                    .then(function(resJSON) {
                      ghostNodeHolder = document.createElement("img");
                      ghostNodeHolder.setAttribute("id", "ghostNode");
                      ghostNodeHolder.setAttribute(
                        "class",
                        "ghost-node rounded-circle"
                      );
                      ghostNodeHolder.setAttribute(
                        "width",
                        320 * network.getScale()
                      );
                      ghostNodeHolder.setAttribute(
                        "height",
                        320 * network.getScale()
                      );
                      ghostNodeHolder.src = resJSON["image"];
                      ghostNodeHolder.setAttribute(
                        "data-artistId",
                        clickedArtistId
                      );
                      document.body.appendChild(ghostNodeHolder);
                    });
                }
              });

              b.addEventListener("click", function(e) {
                console.log("Network restarting...");
                MicroModal.close("main-modal");
                let params = {
                  method: "POST",
                  headers: {
                    "content-type": "application/json"
                  },
                  body: JSON.stringify({
                    "artist-id": encodeURIComponent(
                      this.getElementsByTagName("input")[0].getAttribute(
                        "data-artistid"
                      )
                    )
                  })
                };
                closeAllLists();

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
              });

              a.appendChild(b);
            }
          } else {
            //console.log("oh no");
          }
        });
    }
  });

  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function(e) {
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

  function closeAllLists(elmnt) {
    let x = document.getElementsByClassName("autocomplete-items");
    for (let i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }

  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function(e) {
    closeAllLists(e.target);
  });
}
