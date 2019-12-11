// var DIR = 'https://www.thetaranights.com/wp-content/uploads/2018/fiverr_reviews/';

var nodes = null;
var edges = null;
var network = null;
var nodeIds = [];

var canvasEdgeMargins = 60;
var networkElement = document.getElementById("mynetwork");
var bounds = networkElement.getBoundingClientRect();
var mouseX;
var mouseY;
var highlightedNode = null;

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

function initLoader(){
  MicroModal.show('loading-modal');
}

function closeLoader(){
  MicroModal.close('loading-modal');
}

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
      // membersCreated: false,
      // relArtistsCreated: false
    },
    edges: {
      selectionWidth: 0,
      color: {
        color: defaultColor,
        highlight: highlightColor
      }
    },
    physics: {
      // barnesHut: {
      //   springLength: 800,
      //   springConstant: 0.03,
      //   avoidOverlap: 1,
      //   centralGravity: 0
      // }
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
    var scaleOption = { scale: 0.8 };
    network.moveTo({
      scale: 0.5,
      animation: {
        // -------------------> can be a boolean too!
        duration: 1000,
        easingFunction: "easeOutQuad"
      }
    });
  });

  network.on("dragEnd", function(params) {
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

          let showParams = {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ "artist-id": artistId })
          };

          // send request for artist's related artists
          fetch("/show", showParams)
            .then(function(res) {
              return res.json();
            })
            .then(function(resJSON) {
              releasedNode.setOptions({ borderWidth: defaultBorderWidth });
              renderCluster(releasedNodeId, resJSON.relatedArtists);
            });
        }
      }
    }
  });

  network.on("hoverNode", function(params) {
    params.event = "[original event]";
  });

  network.on("dragging", function(params) {
    if (params.nodes.length > 0) {
      //console.log("DRAGGING NODE");
    }
  });

  var clickThreshold = 300;

  network.on("click", function(params) {
    var clickTime = new Date();

    if (clickTime - doubleClickTime > clickThreshold) {
      setTimeout(function() {
        if (clickTime - doubleClickTime > clickThreshold) {
          onClick(params);
        }
      }, clickThreshold);
    }
  });

  function onClick(params) {
    if (params.nodes.length > 0) {
      highlightedNode = network.body.nodes[params.nodes[0]];
      console.log("CLICK");
    } else {
      highlightedNode = null;
      console.log("UNCLICK");
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
          console.log(canvasCoords);
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

function openNodeModal(params) {
  let selectedNode = network.body.nodes[params.nodes[0]];
  document.getElementById("modal-1-title").innerHTML =
    selectedNode.options.label;

  console.log("SPOTIFY ID: " + selectedNode.options.spotifyId);

  let spotifyModalElement = document.getElementById("modal-1-spotify");
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

  MicroModal.show("modal-1", {
    onClose: modal => onCloseNodeModal(spotifyModalElement)
  });

  console.log("ID = " + selectedNode.options.spotifyId);

  let relatedParams = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      "artist-spotify-id": selectedNode.options.spotifyId
    })
  };

  fetch("/related", relatedParams)
    .then(function(res) {
      return res.json();
    })
    .then(function(resJSON) {
      let resLen = Object.keys(resJSON).length;
      console.log(resLen);
      for (let i = 0; i < resLen; i++) {
        let relArtImg = document.createElement("img");
        relArtImg.setAttribute("id", "rel-artist-img-" + i);
        relArtImg.setAttribute("class", "rounded-circle related-artist-image");
        relArtImg.setAttribute("width", "60");
        relArtImg.setAttribute("height", "60");
        relArtImg.src = resJSON[i].image;
        spotifyModalElement.appendChild(relArtImg);
      }
    });
}

function onCloseNodeModal(spotifyModalElement) {
  spotifyModalElement.removeChild(document.getElementById("spotify-player"));
  let relArtists = spotifyModalElement.getElementsByClassName("rounded-circle");
  let relLen = relArtists.length;
  //console.log(relArtists);
  for (let i = 0; i < relLen; i++) {
    relArtists[0].parentNode.removeChild(relArtists[0]);
    //console.log(i + "/" + relLen);
  }
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

      //console.log(relatedArtists[i].name + " : " + relatedArtists[i].spotifyId);

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
  let relArtLeng = Object.keys(artistsData.relatedArtists).length;
  let lastNodeId;
  if (nodeIds.length > 0) {
    lastNodeId = nodeIds[nodeIds.length - 1];
  } else {
    lastNodeId = -1;
  }

  // checks the entire network for an identical node
  let mainArtistNodeId = null;

  for (let j = 0; j <= lastNodeId; j++) {
    if (network.body.nodes[j].options.artistId == artistsData.artist.id) {
      mainArtistNodeId = network.body.nodes[j].options.id;
      break;
    }
  }

  // if node does not already exists in network
  if (!mainArtistNodeId) {
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
  } else {
    renderCluster(mainArtistNodeId, artistsData.relatedArtists);
  }
}
