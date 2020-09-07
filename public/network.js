////////////////////////////////////////////////////////////////////////////////////////
//                                NETWORK RELATED CODE
////////////////////////////////////////////////////////////////////////////////////////
// @bernardolk - Bernardo Knackfuss 2019 - 2020
////////////////////////////////////////////////////////////////////////////////////////

var NodeList = null;
var EdgeList = null;
var Network = null;
var NodeIds = [];
var SelectedNode;
var MouseX;
var MouseY;
var HighlightedNode = null;
var RelatedArtistList = [];

const doubleClickInterval = 300;
const INITIAL_ZOOM_LEVEL = 0.32;

////////////////////////////////////////////////////////////////////////////////////////
//                                NODE AND EDGES STYLING
////////////////////////////////////////////////////////////////////////////////////////
const defaultColor = "steelBlue";
const highlightColor = "yellow";
const parentNodeColor = "steelBlue";
const loadingColor = "purple";
const relatedArtistEdgeColor = "seaGreen";
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
const largerBorderWidth = 6;
const fixedNodeOptions = {
   fixed: { x: true, y: true },
   borderWidth: largerBorderWidth,
   color: { border: "darkGrey" }
};
const unfixedNodeOptions = {
   fixed: { x: false, y: false },
};
const noRelatedArtistsColor = "pink";
const edgesWidth = 3.5;

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
   NodeIds = [];
   NodeList = new vis.DataSet();
   EdgeList = new vis.DataSet();

   let container = document.getElementById("network-canvas");

   let data = {
      nodes: NodeList,
      edges: EdgeList
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
         },
         width: edgesWidth
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

   Network = new vis.Network(container, data, options);

   createNode(artistsData, null, null);

   //-------------------------------------------------
   //        Event Listeners
   //-------------------------------------------------

   Network.once("startStabilizing", function () {
      Network.moveTo({
         scale: INITIAL_ZOOM_LEVEL,
         animation: {
            duration: 1000,
            easingFunction: "easeOutQuad"
         }
      });
   });

   Network.on("dragEnd", async function (params) {
      if (params.nodes.length > 0 && params.edges.length > 0) {
         let releasedNodeId = params.nodes[0];
         let releasedNode = Network.body.nodes[releasedNodeId];

         // checks if user isnt dragging a fixed node (dont create links for those)
         // Also checks if this node was found in MB database (if it was, then it's id [MBID]
         // should be different than the artist's name, as this is the default when the node is
         // created by spawning another node's related artists)
         if (
            releasedNode.options.fixed.x == false &&
            releasedNode.options.fixed.y == false &&
            releasedNode.options.artistId !== releasedNode.options.label
         ) {
            // checks if this node has already generated children
            if (releasedNode.options.membersCreated == false) {
               let artistId = releasedNode.options.artistId;

               // Augment original node edge length upon release
               const edge = Network.body.edges[params.edges[0]];
               edge.options.length = largerEdgeLegth;

               // Change properties of node upon release as well
               releasedNode.setOptions(releasedNodeOptions);
               let artistData = await getArtistInfo(artistId);
               releasedNode.options.title = artistData.artist.bio;

               let options = { edges: { color: defaultColor } };
               renderCluster(releasedNodeId, artistData.relations, options, true);
            }
         }
      }
   });

   Network.on("click", function (params) {
      var clickTime = new Date();

      if (clickTime - doubleClickTime > doubleClickInterval) {
         setTimeout(function () {
            if (clickTime - doubleClickTime > doubleClickInterval) {
               onClick(params);
            }
         }, doubleClickInterval);
      }
   });

   function onClick(params) {
      if (params.nodes.length > 0) {
         HighlightedNode = Network.body.nodes[params.nodes[0]];
      } else {
         HighlightedNode = null;
      }
   }

   var doubleClickTime = 0;

   Network.on("doubleClick", function (params) {
      doubleClickTime = new Date();

      // user double clicked on a node
      if (params.nodes.length > 0) {
         // render modal with artist's information
         openNodeModal(params);
      }
      // user double clicked outside a node (empty space)
      else {
         if (!HighlightedNode) {
            if (!maxRepulsionMode) {
               Network.setOptions({
                  physics: { repulsion: { nodeDistance: maxRepulsion } }
               });
               maxRepulsionMode = true;
            }
            else {
               Network.setOptions({
                  physics: { repulsion: { nodeDistance: minRepulsion } }
               });
               maxRepulsionMode = false;
            }
         }
         else {
            if (HighlightedNode.options.fixed.x == false
               && HighlightedNode.options.fixed.y == false) {
               // user clicked on a node and now is double clicking outside it
               let canvasCoords = Network.DOMtoCanvas({ x: MouseX, y: MouseY });

               // saves node styling options before fixing it so we can restore
               // those later when we unfix it 
               let originalColor = HighlightedNode.options.color.border;
               let originalBorderWidth = HighlightedNode.options.borderWidth;

               HighlightedNode.setOptions({
                  x: canvasCoords.x,
                  y: canvasCoords.y,
                  originalColor: originalColor,
                  originalBorderWidth: originalBorderWidth
               });

               HighlightedNode.setOptions(fixedNodeOptions);
               Network.startSimulation();
            }
            else {
               HighlightedNode.setOptions({
                  ...unfixedNodeOptions,
                  color: { border: HighlightedNode.options.originalColor },
                  borderWidth: HighlightedNode.options.originalBorderWidth
               });
               Network.startSimulation();
            }
            HighlightedNode = null;
         }
      }
   });
}




////////////////////////////////////////////////////////////////////////////////////////
//                           ON ARTIST`S NODE CLICK OPEN MODAL
////////////////////////////////////////////////////////////////////////////////////////
async function openNodeModal(params) {
   hideBtns();

   SelectedNode = Network.body.nodes[params.nodes[0]];
   // Set artist's name as title of the modal
   document.getElementById("node-modal-title").innerHTML =
      SelectedNode.options.label;

   let relArtistsBtn = document.getElementById('spawn-rel-artists-btn');
   let player = document.getElementById("iframe-spotify");

   player.src = "https://open.spotify.com/embed/artist/" + SelectedNode.options.spotifyId;
   player.height = window.innerWidth < 500 ? "80" : "420";

   // Opens modal
   MicroModal.show("node-modal", {
      onClose: onCloseNodeModal
   });

   if (SelectedNode.options.spotifyId) {
      // fetch data from spotify
      let spotifyRelArtists =
         await getRelatedArtists(SelectedNode.options.spotifyId);

      if (SelectedNode.options.relArtistsCreated) {
         relArtistsBtn.style.backgroundColor = "grey";
      }

      relArtistsBtn.addEventListener("click", onRelArtistsBtnClick);

      let relArtists = spotifyRelArtists.artists.map(artist => {
         return ({
            name: artist.name,
            spotifyId: artist.id,
            genres: artist.genres,
            image: artist.images.length > 0 ?
               artist.images[artist.images.length - 1].url : NOT_FOUND_PIC
         });
      });


      let rowCount = 0;
      Object.keys(relArtists).forEach((_, i) => {
         if (i % REL_ARTISTS_PER_ROW === 0 && i > 0) {
            rowCount++;
         }
         let j = i % REL_ARTISTS_PER_ROW;
         let imgContainer = document.getElementById(`rel-artist-img-container-${rowCount}-${j}`);
         imgContainer.setAttribute("data-tooltip", relArtists[i].name);

         let relArtImg = document.getElementById(`rel-artist-img-${rowCount}-${j}`);
         relArtImg.src = relArtists[i].image;
         relArtImg.innerHTML = relArtists[i].name + " image";

         RelatedArtistList.push({
            spotifyId: relArtists[i].spotifyId,
            name: relArtists[i].name,
            img: relArtists[i].image
         });
      });
   }
}


////////////////////////////////////////////////////////////////////////////////////////
//                          ON CLICK SPAWN RELATED ARTIST BUTTON
////////////////////////////////////////////////////////////////////////////////////////

//Searches Music Brainz for all artists at once
//It is possible that we get repeated results
//For instance, Alice Cooper is both a Person and a Group
//In that case, we always store the group (if found first)
//If we find a Person type before a group, we save it and keep
//scanning for a group. If a group is not found for that artist
//then we use the Person type MBID (MusicBrainz ID).
const onRelArtistsBtnClick = async function (event) {
   event.stopPropagation();

   if (SelectedNode.options.relArtistsCreated) {
      MicroModal.close("node-modal");
      return;
   }

   // construct search query
   let mbQuery = "";
   RelatedArtistList.forEach((artist, i) => {
      if (i > 0) {
         mbQuery += "+";
      }
      mbQuery += `%22${encodeURIComponent(artist.name)}%22`;
   });

   let searchResults = await searchMusicBrainz(mbQuery, 100);

   let musicBrainzArtists = Object.keys(searchResults.artists)
      .map((key) => searchResults.artists[key]);

   let names = RelatedArtistList.map(x => x.name);
   musicBrainzArtists = musicBrainzArtists.filter(x => names.includes(x.name));

   // Deals with duplicate names (by chosing the entry with highest score)
   // BEGIN

   let mb_names = [];
   let mb_duplicates = [];
   musicBrainzArtists.forEach(item => {
      if (!mb_names.includes(item.name)) {
         mb_names.push(item.name);
      }
      else if (!mb_duplicates.includes(item.name)) {
         mb_duplicates.push(item.name);
      }
   });

   let chosen_artists = mb_duplicates.map(duplicateName => {
      let duplicates = musicBrainzArtists.filter(x => x.name === duplicateName);
      let max_score = 0;
      let chosen_artist = null;
      duplicates.forEach(artist => {
         if (artist.score > max_score) {
            max_score = artist.score;
            chosen_artist = artist;
         }
      });
      return chosen_artist;
   });

   let non_duplicate_mb_artists = musicBrainzArtists.filter(x => !mb_duplicates.includes(x.name));
   chosen_artists.forEach(artist => non_duplicate_mb_artists.push(artist));

   // END

   let relations = [];

   RelatedArtistList.forEach((relatedArtist) => {
      let relation = {
         spotify: {
            id: relatedArtist.spotifyId,
            image: relatedArtist.img,
         },
         name: relatedArtist.name,
         id: null
      };

      let id, personId = null;
      non_duplicate_mb_artists.forEach((artistItem) => {
         if (artistItem.name.toUpperCase() === relatedArtist.name.toUpperCase()) {
            if (artistItem.type === "Group") {
               id = artistItem.id;
            }
            else if (artistItem.type === "Person") {
               personId = artistItem.id;
            }
         }
      });

      // If no group match is found, check scanned names list for a 'person' type match
      if (!id && personId) {
         id = personId;
      }
      if (id) {
         relation.id = id;
         relations.push(relation);
      }
   });


   let options = { edges: { color: relatedArtistEdgeColor } };
   SelectedNode.setOptions({ relArtistsCreated: true });
   MicroModal.close("node-modal");

   renderCluster(SelectedNode.options.id, relations, options);
};


var onCloseNodeModal = () => {
   displayBtns();

   RelatedArtistList = [];
   document
      .getElementById("spawn-rel-artists-btn")
      .removeEventListener("click", onRelArtistsBtnClick);
};


////////////////////////////////////////////////////////////////////////////////////////
//                               RENDER CLUSTER
////////////////////////////////////////////////////////////////////////////////////////
// Create related artists nodes (cluster)
function renderCluster(targetNodeId, relatedArtists, options, wasDragged) {
   let numberOfArtists = Object.keys(relatedArtists).length;
   let targetNode = Network.body.nodes[targetNodeId];

   // Only has it's parent node as a related artist
   if (wasDragged && numberOfArtists == 0) {
      targetNode.setOptions({ color: { border: noRelatedArtistsColor } });
      return;
   }

   const onHoverLabel = (values, _id, _selected, _hovering) => {
      values.size = 50;
   };

   for (let i = 0; i < numberOfArtists; i++) {

      const getEdgeProps = () => {
         let edgeLabel = {};
         let attributes = "Related artist";

         if (relatedArtists[i].formation) {
            const from = relatedArtists[i].formation.from;
            const to = relatedArtists[i].formation.to;
            edgeLabel = {
               label: `${from} - ${to}`,
               font: {
                  align: 'top',
                  size: 28,
                  strokeWidth: 0,
                  color: '#ffffff'
               }
            };
            if (relatedArtists[i].attributes.length > 0) {
               attributes = relatedArtists[i].attributes.join(', ');
            }
            else {
               attributes = "No additional info";
            }
         }

         return {
            ...edgeLabel,
            title: attributes
         }
      }

      let lastNodeId = NodeIds[NodeIds.length - 1];
      let duplicatedNode = null;

      // checks the entire network for an identical node
      for (let j = 0; j <= lastNodeId; j++) {
         if (Network.body.nodes[j].options.artistId === relatedArtists[i].id) {
            duplicatedNode = Network.body.nodes[j];
            break;
         }
      }

      // if node does not already exists in network
      if (duplicatedNode == null) {
         NodeList.add({
            id: lastNodeId + 1,
            artistId: relatedArtists[i].id,
            spotifyId: relatedArtists[i].spotify.id,
            membersCreated: false,
            relArtistsCreated: false,
            label: relatedArtists[i].name,
            image: relatedArtists[i].spotify.image,
            x: targetNode.x,
            y: targetNode.y,
         });

         let edgeProps = getEdgeProps();

         EdgeList.add({
            from: targetNodeId,
            to: lastNodeId + 1,
            color: { color: options.edges.color },
            ...edgeProps
         });

         NodeIds.push(lastNodeId + 1);
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

            const edgeProps = getEdgeProps();

            EdgeList.add({
               from: targetNodeId,
               to: duplicatedNode.options.id,
               color: { color: options.edges.color },
               ...edgeProps
            });
         }
      }
   }
}

////////////////////////////////////////////////////////////////////////////////////////
//                                  DESTROY NETWORK
////////////////////////////////////////////////////////////////////////////////////////
// Destroy network. Used when starting over the graph.
function clearNetwork() {
   if (Network !== null) {
      Network.destroy();
      NodeList = null;
      EdgeList = null;
      NodeIds = [];
      Network = null;
   }
}


////////////////////////////////////////////////////////////////////////////////////////
//                                  CREATE NODE
////////////////////////////////////////////////////////////////////////////////////////
function createNode(artistsData, Xo, Yo) {
   const artist = artistsData.artist;
   let lastNodeId;
   if (NodeIds.length > 0) {
      lastNodeId = NodeIds[NodeIds.length - 1];
   } else {
      lastNodeId = -1;
   }

   // checks the entire network for an identical node
   let mainArtistNode = null;

   for (let j = 0; j <= lastNodeId; j++) {
      if (Network.body.nodes[j].options.artistId == artist.id) {
         mainArtistNode = Network.body.nodes[j];
         break;
      }
   }

   // if node does not already exists in network
   if (mainArtistNode === null) {
      let newNodeId = lastNodeId + 1;

      NodeList.add({
         id: newNodeId,
         shape: "circularImage",
         image: artist.image,
         label: artist.name,
         artistId: artist.id,
         spotifyId: artist.spotifyId,
         membersCreated: true,
         relArtistsCreated: false,
         size: parentNodeSize,
         mass: 100,
         font: { size: parentFontSize },
         ...fixedNodeOptions,
         originalBorderWidth: largerBorderWidth,
         originalColor: parentNodeColor,
         x: Xo,
         y: Yo,
         borderWidth: largerBorderWidth,
         title: artist.bio
      });

      NodeIds.push(newNodeId);
      renderCluster(newNodeId, artistsData.relations, { edges: { color: defaultColor } });
   }
   // if it exists, then we just create the relevant nodes around it
   else {
      if (!mainArtistNode.options.membersCreated) {

         // Augment node and node edge's and release it if fixed
         Network.body.edges[mainArtistNode.edges[0].id].setOptions({
            length: largerEdgeLegth
         });
         mainArtistNode.setOptions(releasedNodeOptions);

         let options = { edges: { color: defaultColor } };
         renderCluster(
            mainArtistNode.options.id,
            artistsData.relations,
            options
         );
      }
   }
}
