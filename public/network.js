// var DIR = 'https://www.thetaranights.com/wp-content/uploads/2018/fiverr_reviews/';

var nodes = null;
var edges = null;
var network = null;
var nodeIds = [0];

var canvasEdgeMargins = 60;
var networkElement = document.getElementById("mynetwork");
var bounds = networkElement.getBoundingClientRect();
var mouseX;
var mouseY;
var highlightedNode = null;
var ghostNodeArtistId = null;

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
const minRepulsion = 400;
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

document.body.addEventListener("mousemove", function(e) {
  mouseX = e.clientX - bounds.left;
  mouseY = e.clientY - bounds.top;
  console.log(mouseX + " " + mouseY);

  if (ghostNodeArtistId != null) {
    //let ghostNode = network.body.nodes[ghostNodeId];
    console.log("ooh");
    // ghostNode.setOptions({ x: mouseX});
    // ghostNode.setOptions({ y: mouseY});
    let gNode = document.getElementById('ghostNode');
    gNode.style.left = mouseX + 'px';
    gNode.style.top = mouseY + 'px';
  }
});

// Called when the Visualization API is loaded.
function startNetwork(artistsData) {
  let nodesArray = [];
  let maxRepulsionMode = false;

  let relArtLeng = Object.keys(artistsData.relatedArtists).length;
  console.log(relArtLeng);
  for (let i = 1; i <= relArtLeng; i++) {
    nodesArray[i] = {
      id: i,
      shape: "circularImage",
      image: artistsData.relatedArtists[i - 1].image,
      label: artistsData.relatedArtists[i - 1].name,
      artistId: artistsData.relatedArtists[i - 1].id,
      spotifyId: artistsData.relatedArtists[i - 1].spotifyId,
      membersCreated: false,
      relArtistsCreated: false,
      size: nodeSize
    };
    nodeIds.push(i);
  }

  nodesArray[0] = {
    id: 0,
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
    borderWidth: largerBorderWidth
  };

  nodes = new vis.DataSet(nodesArray);

  // create connections between nodes
  let edgesArray = [];
  let edgesQty = nodesArray.length;

  for (var i = 1; i < edgesQty; i++) {
    edgesArray.push({ id: i, from: 0, to: i });
  }
  edges = new vis.DataSet(edgesArray);

  var container = document.getElementById("mynetwork");

  var data = {
    nodes: nodes,
    edges: edges
  };

  var options = {
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
          // effects applied to the node after it is released
          releasedNode.setOptions(releasedNodeOptions);

          // Augment original node length upon release
          releasedNode.edges[0].setOptions({ length: largerEdgeLegth });

          // change released node's edges to another color
          for (let i = 0; i < params.edges.length; i++) {
            let selectedEdgeId = params.edges[i];
            let selectedEdge = network.body.edges[selectedEdgeId];
            selectedEdge.setOptions({ color: { color: parentNodeColor } });
          }

          // set a post request with artistId as body
          let artistId = releasedNode.options.artistId;

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
        relArtImg.setAttribute("class", "rounded-circle");
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
  console.log(relArtists);
  for (let i = 0; i < relLen; i++) {
    relArtists[0].parentNode.removeChild(relArtists[0]);
    console.log(i + "/" + relLen);
  }
}

// Create related artists nodes (cluster)
function renderCluster(targetNodeId, relatedArtists) {
  let numberOfArtists = Object.keys(relatedArtists).length;
  let targetNode = network.body.nodes[targetNodeId];

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

function createGhostNode(artistId, name, img) {
  console.log("ghost node method activated ");
  let lastNodeId = nodeIds[nodeIds.length - 1];
  nodeIds.push(lastNodeId + 1);
  if (network == null) {
    let params = {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ "artist-id": artistId })
    };

    fetch("/show", params)
      .then(function(response) {
        return response.json();
      })
      .then(function(resJson) {
        // deletes the network and restarts it with the newly selected artist's data
        clearNetwork();
        startNetwork(resJson);
      });
  } else {
    nodes.add({
      id: lastNodeId + 1,
      artistId: artistId,
      spotifyId: null,
      membersCreated: false,
      relArtistsCreated: false,
      label: name,
      image: img,
      x: 0,
      y: 0
    });

    ghostNodeId = lastNodeId + 1;
  }
}
