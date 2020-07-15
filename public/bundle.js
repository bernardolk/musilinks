(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = debounce;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
const debounce = require("lodash.debounce");

// Control variables
var ghostNodeClick = false;
var ghostNodeHolder = null;
var mainModalOpen = false;
const debounceInterval = 500;
var tutorialTooltipDisplayed = false;
var helpPopUpDisplayed = false;
var networkElement = document.getElementById("network-canvas");
var bounds = networkElement.getBoundingClientRect();


// ---------------------------------------------
//             authenticate client
// ---------------------------------------------
var spotifyToken = null;
var tokenExpiration = 3000;

// getTokens();


//get token
async function getTokens() {

   async function getSpotifyToken() {
      // ({ token: spotifyToken, expiration: tokenExpiration } = await fetch("/token")
      let rol = await fetch("/token")
         .then(function (res) {
            return res.json();
         })
         .then(function (token) {
            window.spotifyGetParams = {
               method: "GET",
               headers: {
                  Authorization: "Bearer " + token
               },
               mode: "cors",
               cache: "default"
            };
         });
   }

   while (true) {
      await new Promise((ok,notok) => setTimeout(ok(getSpotifyToken), tokenExpiration));
   }
}

test();

function test(){
   if(spotifyToken !== null){
      MicroModal.close("loading-modal");      
      MicroModal.show("main-modal", {
         onClose: onMainModalClose,
         onShow: onMainModalShow
      });
   }
   else{
      MicroModal.show("loading-modal");

   }
}

// ---------------------------------------------
//             modal controls
// ---------------------------------------------
function showLoader() {
   MicroModal.show("loading-modal");
}
function closeLoader() {
   MicroModal.close("loading-modal");
   if (!helpPopUpDisplayed) {
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
   searchBar.value = "";
};

const onMainModalShow = () => {
   mainModalOpen = true;

   document
      .getElementById("open-search-btn")
      .classList.add("quick-hidden");

   if (network) {
      document
         .getElementById("main-modal__overlay")
         .setAttribute("data-micromodal-close", "");
   }

   if (!tutorialTooltipDisplayed) {
      const helpTooltip = document.getElementById("helpTooltip");
      setTimeout(function () {
         helpTooltip.classList.add("visible");
         setTimeout(function () {
            helpTooltip.classList.remove("visible");
            helpTooltip.classList.add("hidden");
            setTimeout(function () {
               helpTooltip.classList.remove("hidden");
               tutorialTooltipDisplayed = true;
            }, 2000);
         }, 3200);
      }, 1200);
   }
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

document.onkeypress = function (e) {
   e = e || window.event;
   let charCode = typeof e.which == "number" ? e.which : e.keyCode;
   if (charCode && !mainModalOpen) {
      MicroModal.show("main-modal", {
         onClose: onMainModalClose,
         onShow: onMainModalShow
      });
   }
};

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
   })
});

// ---------------------------------------------
//                autocomplete
// ---------------------------------------------

//Apply event listeners
const searchBar = document.getElementById("search-bar");
var searchInput;
autocomplete(searchBar);

let debouncedSearch = debounce(async function () {
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

},{"lodash.debounce":1}]},{},[2]);
