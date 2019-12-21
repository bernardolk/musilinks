var nodes = null;
var edges = null;
var network = null;
var nodeIds = [];

var networkElement = document.getElementById("mynetwork");
var bounds = networkElement.getBoundingClientRect();
var mouseX;
var mouseY;
var highlightedNode = null;

const relArtistsPerRowInModal = 4;
const doubleClickInterval = 300;


// Node and Edges Styling Consts
//--------------------------------------
const defaultColor = "seaGreen";
const highlightColor = "yellow";
const parentNodeColor = "steelBlue";
const loadingColor = "purple";
const defaultEdgeLength = 500;
const largerEdgeLegth = 1400;
const nodeSize = 80;
const parentNodeSize = 160;
const defaultFontSize = 40;
const parentFontSize = 55;
const defaultFontColor = "#eeeeee";
const minRepulsion = 500;
const maxRepulsion = 1000;
const defaultBorderWidth = 2;
const largerBorderWidth = 5;
const fixedNodeOptions = {
  fixed: { x: true, y: true },
  borderWidth: largerBorderWidth
};
const unfixedNodeOptions = {
  fixed: { x: false, y: false },
  borderWidth: defaultBorderWidth
};
// effects applied to the node after it is released
const releasedNodeOptions = {
  membersCreated: true,
  color: { border: parentNodeColor },
  borderWidth: largerBorderWidth,
  size: parentNodeSize,
  font: { size: parentFontSize }
};

// Initializes the micromodal instance
MicroModal.init();

// Called when the Visualization API is loaded.
function startNetwork(artistsData) {
  let maxRepulsionMode = false;
  nodeIds = [];
  nodes = new vis.DataSet();
  edges = new vis.DataSet();

  let container = document.getElementById("mynetwork");

  let data = {
    nodes: nodes,
    edges: edges
  };

  let options = {
    nodes: {
      size: nodeSize,
      color: {
        background: defaultColor,
        highlight: highlightColor,
        border: defaultColor
      },
      font: { color: defaultFontColor, size: defaultFontSize },
      shape: "circularImage",
      borderWidth: defaultBorderWidth
    },
    edges: {
      selectionWidth: 0,
      color: {
        color: defaultColor,
        highlight: highlightColor
      }
    },
    physics: {
      solver: "repulsion",
      repulsion: {
        nodeDistance: minRepulsion,
        springLength: defaultEdgeLength,
        springConstant: 0.03
      }
    }
  };

  network = new vis.Network(container, data, options);

  createNode(artistsData, null, null);

  //-------------------------------------------------
  //        Event Listeners
  //-------------------------------------------------

  network.once("startStabilizing", function() {
    network.moveTo({
      scale: 0.5,
      animation: {
        duration: 1000,
        easingFunction: "easeOutQuad"
      }
    });
  });

  network.on("dragEnd", async function(params) {
    if (params.nodes.length > 0 && params.edges.length > 0) {
      let releasedNodeId = params.nodes[0];
      let releasedNode = network.body.nodes[releasedNodeId];

      // checks if user isnt dragging a fixed node (dont create links for those)
      if (
        releasedNode.options.fixed.x == false &&
        releasedNode.options.fixed.y == false
      ) {
        // checks if this node has already generated children
        if (releasedNode.options.membersCreated == false) {
          // set a post request with artistId as body
          let artistId = releasedNode.options.artistId;

          // Augment original node length upon release
          network.body.edges[params.edges[0]].setOptions({
            length: largerEdgeLegth
          });

          releasedNode.setOptions(releasedNodeOptions);

          let artistData = await getArtistInfo(artistId);

          releasedNode.setOptions({ borderWidth: defaultBorderWidth });
          renderCluster(releasedNodeId, artistData.relatedArtists);
        }
      }
    }
  });

  network.on("click", function(params) {
    var clickTime = new Date();

    if (clickTime - doubleClickTime > doubleClickInterval) {
      setTimeout(function() {
        if (clickTime - doubleClickTime > doubleClickInterval) {
          onClick(params);
        }
      }, doubleClickInterval);
    }
  });

  function onClick(params) {
    if (params.nodes.length > 0) {
      highlightedNode = network.body.nodes[params.nodes[0]];
    } else {
      highlightedNode = null;
    }
  }

  var doubleClickTime = 0;

  network.on("doubleClick", function(params) {
    doubleClickTime = new Date();

    // user double clicked on a node
    if (params.nodes.length > 0) {
      // render modal with artist's information
      openNodeModal(params);
    } else {
      if (!highlightedNode) {
        if (!maxRepulsionMode) {
          network.setOptions({
            physics: { repulsion: { nodeDistance: maxRepulsion } }
          });
          maxRepulsionMode = true;
        } else {
          network.setOptions({
            physics: { repulsion: { nodeDistance: minRepulsion } }
          });
          maxRepulsionMode = false;
        }
      } else {
        if (
          highlightedNode.options.fixed.x == false &&
          highlightedNode.options.fixed.y == false
        ) {
          // user clicked on a node and now is double clicking outside it
          let canvasCoords = network.DOMtoCanvas({ x: mouseX, y: mouseY });
  
          highlightedNode.setOptions({
            x: canvasCoords.x,
            y: canvasCoords.y
          });
          highlightedNode.setOptions(fixedNodeOptions);
          network.startSimulation();
        } else {
          highlightedNode.setOptions(unfixedNodeOptions);
          network.startSimulation();
        }
        highlightedNode = null;
      }
    }
  });
}

async function openNodeModal(params) {
  let selectedNode = network.body.nodes[params.nodes[0]];
  // Set artist's name as title of the modal
  document.getElementById("modal-1-title").innerHTML = selectedNode.options.label;

  // Creates spotify player 
  let spotifyModalElement = document.getElementById("modal-1-player");
  let player = document.createElement("iframe");
  player.id = "spotify-player";
  player.src =
    "https://open.spotify.com/embed/artist/" + selectedNode.options.spotifyId;
  player.width = "300";
  player.height = "400";
  player.frameBorder = "0";
  player.allowtransparency = "true";
  player.allow = "encrypted-media";
  spotifyModalElement.appendChild(player);

  // Opens modal
  MicroModal.show("modal-1", {
    onClose: modal => onCloseNodeModal(spotifyModalElement)
  });

  let spotifyRelArtistElement = document.getElementById("modal-1-related");

  // fetch data from spotify
  let spotifyRelArtists = await getRelatedArtists(selectedNode.options.spotifyId);

  let relArtistsBtn = document.getElementById("spawn-rel-artists-btn");
  relArtistsBtn.addEventListener("click", e => {onRelArtistsBtnClick(e,selectedNode);});

  // Creates more 'friendly' object to work with (not realy needed anymore)
  let relArtists = {};
  let relLength = spotifyRelArtists.artists.length;
  for (let i = 0; i < relLength; i++) {
    relArtists[i] = {
      name: spotifyRelArtists.artists[i].name,
      spotifyId: spotifyRelArtists.artists[i].id,
      genres: spotifyRelArtists.artists[i].genres,
      image: "notfound.jpg"
    };
    if (spotifyRelArtists.artists[i].images.length > 0) {
      relArtists[i].image = spotifyRelArtists.artists[i].images[0].url;
    }
  }  

  // Create related artist's image elements
  let newRow;
  for (let i = 0; i < Object.keys(relArtists).length; i++) {
    if (i % relArtistsPerRowInModal == 0) {
      newRow = document.createElement("div");
      newRow.setAttribute("id", "related-artist-row-" + i);
      newRow.setAttribute("class", "related-artist-row");
      spotifyRelArtistElement.appendChild(newRow);
    }

    let imgContainer = document.createElement("div");
    imgContainer.setAttribute("class", "related-artist-image-div");

    let relArtImg = document.createElement("img");
    relArtImg.setAttribute("id", "rel-artist-img-" + i);
    relArtImg.setAttribute("class", "rounded-circle related-artist-image");
    relArtImg.src = relArtists[i].image;
    relArtImg.innerHTML = relArtists[i].name + " image";

    let relArtLabel = document.createElement("div");
    relArtLabel.setAttribute("class", "related-artist-image-label");
    relArtLabel.innerHTML = relArtists[i].name;

    imgContainer.appendChild(relArtImg);
    imgContainer.appendChild(relArtLabel);
    newRow.appendChild(imgContainer);
  }
}

let onRelArtistsBtnClick = async function(e, selectedNode){
  e.stopPropagation();

  let spotifyId = selectedNode.options.spotifyId;
  let targetNodeId = selectedNode.options.id;

  // Related artist fetch method
  let relatedArtists = await getRelatedArtists(spotifyId);
  let relArtLen = relatedArtists.artists.length;

  let response = {relatedArtists:{}};
  for (let i = 0; i < relArtLen; i++) {
    if(relatedArtists.artists[i].images.length > 0){
      response.relatedArtists[i] = {
        name: relatedArtists.artists[i].name,
        spotifyId: relatedArtists.artists[i].id,
        id: "yeahnope",
        image: relatedArtists.artists[i].images[0].url
      };
    }else{
      // if artist does not have an image
      response.relatedArtists[i] = {
        name: relatedArtists.artists[i].name,
        spotifyId: relatedArtists.artists[i].id,
        id: "yeahnope",
        image: 'notfound.jpg'
      };
    }
  }

  MicroModal.close("modal-1");
  renderCluster(targetNodeId, response.relatedArtists);
}


function onCloseNodeModal(spotifyModalElement) {
  spotifyModalElement.removeChild(document.getElementById("spotify-player"));

  let relArtists = Array.from(
    document.getElementsByClassName("related-artist-row")
  );
  let target = document.getElementById("modal-1-related");
  for (let i = 0; i < relArtists.length; i++) {
    target.removeChild(relArtists[i]);
  }

  document.getElementById("spawn-rel-artists-btn").removeEventListener("click", onRelArtistsBtnClick);

}


// Create related artists nodes (cluster)
function renderCluster(targetNodeId, relatedArtists) {
  let numberOfArtists = Object.keys(relatedArtists).length;
  let targetNode = network.body.nodes[targetNodeId];

  // parent node configuration
  targetNode.setOptions(releasedNodeOptions);

  // Augment original node length upon release
  if (targetNode.edges.length > 0) {
    targetNode.edges[0].setOptions({ length: largerEdgeLegth });

    // change released node's edges to another color
    for (let i = 0; i < targetNode.edges.length; i++) {
      let selectedEdgeId = targetNode.edges[i].id;
      let selectedEdge = network.body.edges[selectedEdgeId];
      selectedEdge.setOptions({ color: { color: parentNodeColor } });
    }
  }

  for (let i = 0; i < numberOfArtists; i++) {
    let lastNodeId = nodeIds[nodeIds.length - 1];
    let duplicatedNode = null;

    // checks the entire network for an identical node
    for (let j = 0; j <= lastNodeId; j++) {
      if (network.body.nodes[j].options.artistId == relatedArtists[i].id) {
        duplicatedNode = network.body.nodes[j];
        break;
      }
    }

    // if node does not already exists in network
    if (duplicatedNode == null) {
      nodes.add({
        id: lastNodeId + 1,
        artistId: relatedArtists[i].id,
        spotifyId: relatedArtists[i].spotifyId,
        membersCreated: false,
        relArtistsCreated: false,
        label: relatedArtists[i].name,
        image: relatedArtists[i].image,
        x: targetNode.x,
        y: targetNode.y
      });

      edges.add({ from: targetNodeId, to: lastNodeId + 1 });
      nodeIds.push(lastNodeId + 1);
    }

    // if node already exists in network, we will only create a new link
    else {
      // Checks if link doesn't already exists
      let linkAlreadyCreated = false;
      for (let j = 0; j < targetNode.edges.length; j++) {
        if (
          targetNode.edges[j].from.options.artistId ==
          duplicatedNode.options.artistId
        ) {
          linkAlreadyCreated = true;
          break;
        }
      }
      // If it's not already created, creates it
      if (!linkAlreadyCreated) {
        edges.add({
          from: targetNodeId,
          to: duplicatedNode.options.id
        });
      }
    }
  }
}

// Destroy network. Used when starting over the graph.
function clearNetwork() {
  if (network !== null) {
    network.destroy();
    network = null;
  }
}

function createNode(artistsData, Xo, Yo) {
  let lastNodeId;
  if (nodeIds.length > 0) {
    lastNodeId = nodeIds[nodeIds.length - 1];
  } else {
    lastNodeId = -1;
  }

  // checks the entire network for an identical node
  let mainArtistNode = null;

  for (let j = 0; j <= lastNodeId; j++) {
    if (network.body.nodes[j].options.artistId == artistsData.artist.id) {
      mainArtistNode = network.body.nodes[j];
      break;
    }
  }

  // if node does not already exists in network
  if (!mainArtistNode) {
    nodes.add({
      id: lastNodeId + 1,
      shape: "circularImage",
      image: artistsData.artist.image,
      label: artistsData.artist.name,
      artistId: artistsData.artist.id,
      spotifyId: artistsData.artist.spotifyId,
      membersCreated: true,
      relArtistsCreated: false,
      size: parentNodeSize,
      mass: 100,
      font: { size: parentFontSize },
      fixed: true,
      x: Xo,
      y: Yo,
      borderWidth: largerBorderWidth
    });
    nodeIds.push(lastNodeId + 1);
    renderCluster(lastNodeId + 1, artistsData.relatedArtists);
  } 
  
  // if it exists, then we just create the relevant nodes around it
  else {
    if(!mainArtistNode.options.membersCreated){
      renderCluster(mainArtistNode.options.id, artistsData.relatedArtists);
    }
  }
}
