// We 'run' the function that creates the listener events
//autocomplete(document.getElementById("myInput"));

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

    // checks when the input is empty and to false
    // so assynchronous fetch promises can be stopped and no results be shown
    // if (!inputVal || inputVal == '') {
    //   closeAllLists();
    //   //showSearchItems = false;
    //   return false;
    // }
    // else{
    //   //showSearchItems = true;
    // }

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
            this.parentNode.appendChild(a);

            for (i = 0; i < jsonLength; i++) {
              b = document.createElement("DIV");
              if(artists[i].description){
                b.innerHTML = artists[i].name + " - <i>" + artists[i].description + "</i>";
              }
              else{
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
              c.setAttribute('class','btn btn-success btn-lg  autocomplete-btn');
              c.innerHTML = '+';
              b.appendChild(c);

              // On 'add' button click
              c.addEventListener("click", function(e){
                e.stopPropagation();
                closeAllLists();

                let clickedArtistId = this.parentNode.getElementsByTagName("input")[0]
                  .getAttribute("data-artistid");
                let clickedArtistName = this.parentNode.getElementsByTagName("input")[0].value;

                // Pass selected artist information to server to render node
                let params = {
                  method: "POST",
                  headers: {
                    "content-type": "application/json"
                  },
                  body: JSON.stringify({
                    "artist-id" : clickedArtistId
                    ,"artist-name": clickedArtistName
                  })
                };

                // Get artist image from spotify to render node
                fetch("/add", params)
                  .then(function(res){return res.json();})
                  .then(function(resJSON) {   
                    console.log("HERE > " + resJSON['image']);
                    //createGhostNode(clickedArtistId, clickedArtistName, resJSON['image']);

                    //let canvas = document.createElement('canvas');
                    //document.body.appendChild(canvas);

                    //let ctx = canvas.getContext("2d");

                    //let overlay = document.getElementById('modal-ghost-node-container');

                    ghostNodeHolder = document.createElement('img');
                    ghostNodeHolder.setAttribute("id", "ghostNode");
                    ghostNodeHolder.setAttribute("class", "ghost-node rounded-circle");
                    ghostNodeHolder.setAttribute("width", nodeSize);
                    ghostNodeHolder.setAttribute("height", nodeSize);
                    ghostNodeHolder.src = resJSON['image'];
                    ghostNodeArtistId = clickedArtistId;

                    //ctx.drawImage(ghostNodeHolder, 100,100);
                    document.body.appendChild(ghostNodeHolder);

                    //overlay.appendChild(ghostNodeHolder);
                    //MicroModal.show('modal-ghost-node');

                  });
              });

              b.addEventListener("click", function(e) {
                console.log("Network restarting...");
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
                //showSearchItems = false;
                closeAllLists();

                fetch("/show", params)
                  .then(function(response) {
                    return response.json();
                  })
                  .then(function(resJson) {
                    // deletes the network and restarts it with the newly selected artist's data
                    clearNetwork();
                    startNetwork(resJson);
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
