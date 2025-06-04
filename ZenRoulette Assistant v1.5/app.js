// ##############################  
// Extension Content Script: Live Roulette Helper (app.js)  
// This script runs on the live roulette game page to track game results,  
// send data to the extension's backend, and highlight recommended bets.  
// ##############################  

// Global state variables to store game data and bet suggestions  
let currentStatus = null;       // Current game status (e.g. "PLACE YOUR BET", "BET CLOSING", etc.)  
let currentLimit = null;        // Current table limit (if any)  
let recentNumbers = null;       // Array of the last 100 winning numbers  
let favoriteNumbers = null;     // Array of the 5 most frequent numbers among the last 100  
let betFavorites = null;        // Array of base numbers to bet on (favorites chosen for betting)  
let betNumbers = [];            // Array of all numbers to bet on (including neighbors of favorites)  
let highStakeNumbers = null;    // Array of "high stake" numbers (frequent numbers that recently appeared or neighbors)  
let playRound = 0;              // Counter for consecutive rounds played with the current dealer  
let currentDealer = null;       // Name of the current dealer  
const REPEAT_ROUND = 4;         // Number of rounds to reuse local recommendations before requesting new ones from server  

// The numbers on a roulette wheel in order (used for neighbor calculations)  
const numbersOnBoard = [  
  "0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27", "13",  
  "36", "11", "30", "8", "23", "10", "5", "24", "16", "33", "1", "20", "14", "31",  
  "9", "22", "18", "29", "7", "28", "12", "35", "3", "26"  
];  

/**  
 * Get the current game status from the page.  
 * @returns {string|null} The current status text (e.g., "PLACE YOUR BET", "BET CLOSING"), or null if not found.  
 */  
function getStatus() {  
  if (document.querySelectorAll('[data-role="status-bar"]').length > 0) {  
    let statusText = document.querySelectorAll('[data-role="status-text"]')[0].innerText;  
    if (statusText.startsWith("PLACE YOUR BET")) {  
      return "PLACE YOUR BET";  
    } else if (statusText.startsWith("BET CLOSING")) {  
      return "BET CLOSING";  
    }  
    return statusText;  
  }  
  return null;  
}  

/**  
 * Get the current dealer's name from the page.  
 * @returns {string|null} The dealer's name, or null if not found.  
 */  
function getDealer() {  
  if (document.querySelectorAll('[data-role="dealerName"]').length > 0) {  
    return document.querySelectorAll('[data-role="dealerName"]')[0].innerText;  
  }  
  return null;  
}  

/**  
 * Retrieve the last 100 winning numbers from the roulette game's history display.  
 * This function will scroll the history (using the paginator) to gather up to 100 recent results.  
 * @returns {string[]} An array of the last up to 100 winning numbers (as strings), with the most recent number at index 0.  
 */  
function getRecentNumbers() {  
  let results = [];  
  let attempts = 0;  
  // Ensure at least one recent-number element is present (history may load after clicking the paginator)  
  while (document.querySelectorAll('[data-role="recent-number"]').length === 0 && attempts < 10) {  
    // Click the left paginator to load history if not immediately available  
    $("div[data-role='paginator-left']").click();  
    attempts++;  
  }  
  // Now gather numbers from the history, scrolling left until we have 100 or reach the oldest available  
  let newNumbers;  
  attempts = 0;  
  do {  
    const numberElements = document.querySelectorAll('[data-role="recent-number"]');  
    newNumbers = Array.from(numberElements).map(elem => {  
      // Each recent-number element likely contains the number in a nested span  
      return elem.children[0].children[0].innerText;  
    });  
    // If this is the first iteration, initialize results with the current page of numbers  
    if (results.length === 0) {  
      results = newNumbers;  
    } else {  
      // Append any additional older numbers that are not already in results  
      // (Assumes no overlapping duplicates between pages except legitimate repeated outcomes)  
      for (let num of newNumbers) {  
        if (results.length >= 100) break;  
        // Only add if this number is not already the last element of results to avoid potential overlap duplication  
        if (results[results.length - 1] !== num) {  
          results.push(num);  
        }  
      }  
    }  
    // If we still need more numbers and a left paginator exists, click it to load older results  
    if (results.length < 100) {  
      const paginatorLeft = document.querySelector("div[data-role='paginator-left']");  
      if (paginatorLeft) {  
        paginatorLeft.click();  
      } else {  
        break; // no more history to load  
      }  
    }  
    attempts++;  
    if (attempts > 20) break;  // safety break to prevent infinite loop  
  } while (results.length < 100);  
  // Ensure we have at most 100 results  
  if (results.length > 100) {  
    results = results.slice(0, 100);  
  }  
  return results;  
}  

/**  
 * Compute the top 5 "favorite" numbers from a list of recent winning numbers.  
 * Favorite numbers are defined as the 5 most frequently appearing numbers in the given list.  
 * @param {string[]} numbersList - Array of recent winning numbers (as strings).  
 * @returns {string[]} An array of up to 5 numbers (as strings) that appear most frequently in numbersList.  
 */  
function computeFavoriteNumbers(numbersList) {  
  const frequency = {};  // frequency map for each number  
  numbersList.forEach(num => {  
    frequency[num] = (frequency[num] || 0) + 1;  
  });  
  // Sort numbers by frequency (descending). If frequencies are equal, preserve original order (using stable sort).  
  const sortedNums = Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]);  
  // Return the top 5 frequent numbers  
  return sortedNums.slice(0, 5);  
}  

function getNextIndex(index) {  
  if (index == 36) {  
    return 0;  
  } else {  
    return index + 1;  
  }  
}  

/**  
 * Get before index from a specified index  
 * @param {*} index  
 * @returns The index immediately before the given index (circular for 0).  
 */  
function getBeforeIndex(index) {  
  if (index == 0) {  
    return 36;  
  } else {  
    return index - 1;  
  }  
}  

/**  
 * Get index in roulette order from a specified number  
 * @param {*} n - The number on the roulette wheel (as string).  
 * @returns {number} The index of number n in the roulette order array.  
 */  
function getIndexFromNumber(n) {  
  return numbersOnBoard.indexOf(n);  
}  

/**  
 * Get the 3-neighborhood of a specified number on the roulette wheel.  
 * (The three numbers immediately clockwise and the three immediately counter-clockwise on the wheel.)  
 * @param {*} n - The number on the roulette wheel (as string).  
 * @returns {string[]} An array of 6 neighboring numbers around n on the wheel.  
 */  
function get3Neighborhood(n) {  
  var neighborhood = [];  
  var index0 = getIndexFromNumber(n);  
  for (var i = 0, index = index0; i < 3; i++) {  
    index = getNextIndex(index);  
    neighborhood.push(numbersOnBoard[index]);  
  }  
  for (var i = 0, index = index0; i < 3; i++) {  
    index = getBeforeIndex(index);  
    neighborhood.push(numbersOnBoard[index]);  
  }  
  return neighborhood;  
}  

function includesRecent(n, recent) {  
  let allNumbers = [n].concat(get3Neighborhood(n));  
  // Check if any of the last 4 winning numbers is either n or one of its neighbors  
  for (var i = 0; i < 4; i++) {  
    if (allNumbers.includes(recent[i])) {  
      return true;  
    }  
  }  
  return false;  
}  

function getHighStakeNumbers(recentNums, hotNums) {  
  // Identify "high stake" numbers: any number in hotNums whose 3-neighborhood intersects the last 4 results  
  var _highStakeNumbers = [];  
  for (var i = 0; i < hotNums.length; i++) {  
    let n = hotNums[i];  
    if (includesRecent(n, recentNums)) {  
      _highStakeNumbers.push(n);  
    }  
  }  
  if (_highStakeNumbers.length == 0) {  
    return null;  
  } else {  
    return _highStakeNumbers;  
  }  
}  

function getNextRecommendation() {  
  // Generate a basic next bet recommendation using the last few results (used when not requesting from server)  
  var _betFavorites = [];  
  var _highStakeNumbers = [];  

  // Use the last 4 winning numbers as initial favorite picks  
  for (var i = 0; i < 4; i++) {  
    _betFavorites.push(recentNumbers[i]);  
  }  
  _betFavorites = _betFavorites.unique();  // remove duplicates  

  // Expand the bet numbers to include each favorite and its 3 neighbors on the wheel  
  var _betNumbers = [];  
  for (var i = 0; i < _betFavorites.length; i++) {  
    _betNumbers.push(_betFavorites[i]);  
    let favorite3Neighborhood = get3Neighborhood(_betFavorites[i]);  
    _betNumbers = _betNumbers.concat(favorite3Neighborhood).unique();  
  }  

  return [_betFavorites, _highStakeNumbers, _betNumbers];  
}  

/**  
 * Determine if the last round was won (i.e., the winning number was one of our bet numbers).  
 * @returns {boolean} true if the last winning number is in betNumbers, else false.  
 */  
function getWon() {  
  let lastNumber = getRecentNumbers()[0];  
  return betNumbers.includes(lastNumber);  
}  

/**  
 * Highlight or de-highlight the recommended bet numbers on the table.  
 * @param {boolean} highlight - If true, highlight the numbers; if false, remove highlight.  
 */  
function highlightBetNumbers(highlight) {  
  betNumbers.forEach(function (value) {  
    let rect = document.querySelectorAll(`[data-bet-spot-id="${value}"]`)[0];  
    // Sometimes a bet spot might not exist or be null, guard for that  
    if (rect !== undefined) {  
      rect.style.fill = highlight ? "orange" : "";  
    }  
  });  
}  

/**  
 * Format a Date object into a string with the given format.  
 * Example format: "HH:mm:ss dd MMM yyyy".  
 * @param {Date} date    - The date/time to format.  
 * @param {string} format - The format pattern.  
 * @param {boolean} utc  - If true, format in UTC time zone, otherwise local.  
 * @returns {string} formatted date/time string.  
 */  
function formatDate(date, format, utc) {  
  var MMMM = ["\x00", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];  
  var MMM = ["\x01", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];  
  var dddd = ["\x02", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];  
  var ddd = ["\x03", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];  

  function ii(i, len) {  
    var s = i + "";  
    len = len || 2;  
    while (s.length < len) s = "0" + s;  
    return s;  
  }  

  var y = utc ? date.getUTCFullYear() : date.getFullYear();  
  format = format.replace(/(^|[^\\])yyyy+/g, "$1" + y);  
  format = format.replace(/(^|[^\\])yy/g, "$1" + y.toString().substr(2, 2));  
  format = format.replace(/(^|[^\\])y/g, "$1" + y);  

  var M = (utc ? date.getUTCMonth() : date.getMonth()) + 1;  
  format = format.replace(/(^|[^\\])MMMM+/g, "$1" + MMMM[0]);  
  format = format.replace(/(^|[^\\])MMM/g, "$1" + MMM[0]);  
  format = format.replace(/(^|[^\\])MM/g, "$1" + ii(M));  
  format = format.replace(/(^|[^\\])M/g, "$1" + M);  

  var d = utc ? date.getUTCDate() : date.getDate();  
  format = format.replace(/(^|[^\\])dddd+/g, "$1" + dddd[0]);  
  format = format.replace(/(^|[^\\])ddd/g, "$1" + ddd[0]);  
  format = format.replace(/(^|[^\\])dd/g, "$1" + ii(d));  
  format = format.replace(/(^|[^\\])d/g, "$1" + d);  

  var H = utc ? date.getUTCHours() : date.getHours();  
  format = format.replace(/(^|[^\\])HH+/g, "$1" + ii(H));  
  format = format.replace(/(^|[^\\])H/g, "$1" + H);  

  var h = H > 12 ? H - 12 : H == 0 ? 12 : H;  
  format = format.replace(/(^|[^\\])hh+/g, "$1" + ii(h));  
  format = format.replace(/(^|[^\\])h/g, "$1" + h);  

  var m = utc ? date.getUTCMinutes() : date.getMinutes();  
  format = format.replace(/(^|[^\\])mm+/g, "$1" + ii(m));  
  format = format.replace(/(^|[^\\])m/g, "$1" + m);  

  var s = utc ? date.getUTCSeconds() : date.getSeconds();  
  format = format.replace(/(^|[^\\])ss+/g, "$1" + ii(s));  
  format = format.replace(/(^|[^\\])s/g, "$1" + s);  

  var f = utc ? date.getUTCMilliseconds() : date.getMilliseconds();  
  format = format.replace(/(^|[^\\])fff+/g, "$1" + ii(f, 3));  
  f = Math.round(f / 10);  
  format = format.replace(/(^|[^\\])ff/g, "$1" + ii(f));  
  f = Math.round(f / 10);  
  format = format.replace(/(^|[^\\])f/g, "$1" + f);  

  var T = H < 12 ? "AM" : "PM";  
  format = format.replace(/(^|[^\\])TT+/g, "$1" + T);  
  format = format.replace(/(^|[^\\])T/g, "$1" + T.charAt(0));  

  var t = T.toLowerCase();  
  format = format.replace(/(^|[^\\])tt+/g, "$1" + t);  
  format = format.replace(/(^|[^\\])t/g, "$1" + t.charAt(0));  

  var tz = -date.getTimezoneOffset();  
  var K = utc || !tz ? "Z" : tz > 0 ? "+" : "-";  
  if (!utc) {  
    tz = Math.abs(tz);  
    var tzHrs = Math.floor(tz / 60);  
    var tzMin = tz % 60;  
    K += ii(tzHrs) + ":" + ii(tzMin);  
  }  
  format = format.replace(/(^|[^\\])K/g, "$1" + K);  

  var day = (utc ? date.getUTCDay() : date.getDay()) + 1;  
  format = format.replace(new RegExp(dddd[0], "g"), dddd[day]);  
  format = format.replace(new RegExp(ddd[0], "g"), ddd[day]);  

  format = format.replace(new RegExp(MMMM[0], "g"), MMMM[M]);  
  format = format.replace(new RegExp(MMM[0], "g"), MMM[M]);  

  format = format.replace(/\\(.)/g, "$1");  

  return format;  
};  

/**  
 * Main function to handle game events and communicate with the extension backend.  
 * This is called when a new betting round begins (status "PLACE YOUR BET") or when certain changes occur.  
 * @param {boolean} sendPlayData - If true, send the previous round's play result data to the background (when a round just ended).  
 */  
async function sendDashboardData(sendPlayData = true) {  
  console.log("sendDashboardData triggered (sendPlayData =", sendPlayData, ")");  
  // Check if this is a new dealer session (or first run) where we should reset and get fresh recommendations  
  if (sendPlayData && (currentDealer === null || currentDealer !== getDealer())) {  
    // If a previous round was in progress with the old dealer, send that round's result to background  
    if (playRound > 0) {  
      // Turn off any highlighted bet numbers from the previous round  
      highlightBetNumbers(false);  
      // Determine last winning number and whether it was a favorite  
      const lastNumber = getRecentNumbers()[0];  
      const wasFavoriteHit = favoriteNumbers ? favoriteNumbers.includes(lastNumber) : false;  
      const won = betNumbers.includes(lastNumber);  
      // Send the outcome of the last round to the background script (for logging/dashboard)  
      chrome.runtime.sendMessage({  
        type: "update-play",  
        playTime: formatDate(new Date(), "HH:mm:ss dd MMM yyyy"),  
        dealer: currentDealer,  
        playRound: playRound,  
        betOn: betFavorites ? betFavorites.join("-") : "",  
        winner: lastNumber,  
        win: won,  
        favorite: wasFavoriteHit  
      });  
    }  
    // Start a new session for the new dealer  
    playRound = 0;  
    betFavorites = null;  
    betNumbers = [];  
    currentDealer = getDealer();  // update dealer name  
    console.log("New dealer detected, starting new session for dealer:", currentDealer);  
    // Gather the latest 100 numbers and calculate the top 5 favorites  
    recentNumbers = getRecentNumbers();  
    favoriteNumbers = computeFavoriteNumbers(recentNumbers);  
    try {  
      // Retrieve the stored authentication token from local storage  
      const tokenData = await chrome.storage.local.get("securityToken");  
      // Prepare and send the "zrr" action request to the background (which will call the backend API)  
      const response = await chrome.runtime.sendMessage({  
        type: "api",  
        data: {  
          action: "zrr",  
          token: tokenData.securityToken,  
          recentNumbers: recentNumbers,  
          favoriteNumbers: favoriteNumbers  
        }  
      });  
      console.log("Sent 'zrr' request to backend with token:", tokenData.securityToken);  
      console.log("Received recommendation response:", response);  
      if (response.success === true) {  
        // If the server provided a recommendation, use it to set up bets for this round  
        betFavorites = response.betFavorites;  
        highStakeNumbers = response.highStakeNumbers;  
        betNumbers = response.betNumbers;  
        playRound = 1;  // starting a new play cycle with server's recommendation  
        // Highlight the recommended bet numbers on the roulette table  
        highlightBetNumbers(true);  
      } else {  
        // If the server indicates an issue or no recommendation  
        if (response.token === undefined) {  
          // If token was invalid/expired (no token in response), trigger logout  
          chrome.runtime.sendMessage({ type: "logout" });  
        } else {  
          // No recommendation but token is valid: no bets this round (stay)  
          betFavorites = null;  
          highStakeNumbers = null;  
          betNumbers = [];  
          console.log("No recommendation from server; staying this round with no bets.");  
        }  
      }  
      // Update the dashboard with the new data (recent numbers, favorites, bets, etc.)  
      chrome.runtime.sendMessage({  
        type: "update-dashboard",  
        recentNumbers: recentNumbers,  
        favoriteNumbers: favoriteNumbers,  
        betFavorites: betFavorites,  
        betNumbers: betNumbers,  
        highStakeNumbers: getHighStakeNumbers(recentNumbers, favoriteNumbers),  
        dealer: currentDealer  
      });  
      console.log("Dashboard updated for new dealer session.");  
    } catch (error) {  
      console.error("Error during recommendation request:", error);  
    }  
  } else {  
    // Same dealer continuing the game  
    if (playRound > 0) {  
      // Turn off highlights from previous round's bets  
      highlightBetNumbers(false);  
      if (sendPlayData) {  
        // If the previous round just ended, report its outcome  
        const lastNumber = getRecentNumbers()[0];  
        const wasFavoriteHit = favoriteNumbers ? favoriteNumbers.includes(lastNumber) : false;  
        const won = betNumbers.includes(lastNumber);  
        chrome.runtime.sendMessage({  
          type: "update-play",  
          playTime: formatDate(new Date(), "HH:mm:ss dd MMM yyyy"),  
          dealer: currentDealer || getDealer(),  
          playRound: playRound,  
          betOn: betFavorites ? betFavorites.join("-") : "",  
          winner: lastNumber,  
          win: won,  
          favorite: wasFavoriteHit  
        });  
      }  
    }  
    // Increment the play round counter for the current dealer session  
    playRound++;  
    if (playRound <= REPEAT_ROUND) {  
      // Update the recent numbers and favorite numbers for the new round  
      recentNumbers = getRecentNumbers();  
      favoriteNumbers = computeFavoriteNumbers(recentNumbers);  
      // Generate the next recommendation locally (based on recent outcomes)  
      [betFavorites, highStakeNumbers, betNumbers] = getNextRecommendation();  
      // Recompute highStakeNumbers based on updated recent and favorite numbers  
      highStakeNumbers = getHighStakeNumbers(recentNumbers, favoriteNumbers);  
      // Send updated data to the dashboard (no new dealer, continuing play)  
      console.log("Updating dashboard for continuing round (no dealer change).");  
      chrome.runtime.sendMessage({  
        type: "update-dashboard",  
        recentNumbers: recentNumbers,  
        favoriteNumbers: favoriteNumbers,  
        betFavorites: betFavorites,  
        betNumbers: betNumbers,  
        highStakeNumbers: highStakeNumbers,  
        dealer: currentDealer || getDealer()  
      });  
      // Highlight the newly recommended bet numbers  
      highlightBetNumbers(true);  
      return;  
    } else {  
      // We have completed the set number of repeat rounds; reset and prepare to get a new recommendation from server  
      playRound = 0;  
      betFavorites = null;  
      betNumbers = [];  
    }  
    console.log("Requesting new recommendation from server (after repeating local rounds)");  
    // Refresh recent numbers and favorite numbers before contacting server  
    recentNumbers = getRecentNumbers();  
    favoriteNumbers = computeFavoriteNumbers(recentNumbers);  
    try {  
      const tokenData = await chrome.storage.local.get("securityToken");  
      const response = await chrome.runtime.sendMessage({  
        type: "api",  
        data: {  
          action: "zrr",  
          token: tokenData.securityToken,  
          recentNumbers: recentNumbers,  
          favoriteNumbers: favoriteNumbers  
        }  
      });  
      console.log("Sent 'zrr' request to backend with token:", tokenData.securityToken);  
      console.log("Received recommendation response:", response);  
      if (response.success === true) {  
        // Server returned a new recommendation for continuing session  
        betFavorites = response.betFavorites;  
        highStakeNumbers = response.highStakeNumbers;  
        betNumbers = response.betNumbers;  
        playRound = 1;  
        highlightBetNumbers(true);  
      } else {  
        if (response.token === undefined) {  
          chrome.runtime.sendMessage({ type: "logout" });  
        } else {  
          betFavorites = null;  
          highStakeNumbers = null;  
          betNumbers = [];  
          console.log("No recommendation from server; staying this round with no bets.");  
        }  
      }  
      // Update the dashboard with the new recommendation data  
      chrome.runtime.sendMessage({  
        type: "update-dashboard",  
        recentNumbers: recentNumbers,  
        favoriteNumbers: favoriteNumbers,  
        betFavorites: betFavorites,  
        betNumbers: betNumbers,  
        highStakeNumbers: getHighStakeNumbers(recentNumbers, favoriteNumbers),  
        dealer: currentDealer  
      });  
      console.log("Dashboard updated for continuing dealer session.");  
    } catch (error) {  
      console.error("Error during recommendation request:", error);  
    }  
  }  
}  

/**  
 * Handler fired before the game status changes (not used in current logic, placeholder for potential future use).  
 */  
function handleStatusChanging(oldStatus, newStatus) {  
  /*  
  if (oldStatus == null) {  
    sendDashboardData();  
  }  
  */  
}  

/**  
 * Handler fired after the game status has changed.  
 * If the status is "PLACE YOUR BET", we trigger updating the dashboard and possibly getting a recommendation.  
 * @param {*} newStatus - The new status text.  
 */  
function handleStatusChanged(newStatus) {  
  console.log("New status: " + newStatus);  
  if (newStatus == "PLACE YOUR BET") {  
    sendDashboardData();  
  }  
}  

/**  
 * Get the current table history limit (if displayed on the UI).  
 * @returns {string|null} The current history limit value, or null if not found.  
 */  
function getLimit() {  
  if (document.querySelectorAll('[data-role="knob"]').length > 0) {  
    let limit = document.querySelectorAll('[data-role="knob"]')[0].getAttribute("data-role-value");  
    return limit;  
  }  
  return null;  
}  

/**  
 * Main timer function to monitor game events.  
 * It checks for status changes and limit changes at a regular interval (200ms).  
 */  
function mainTimer() {  
  let status = getStatus();  
  if (status != null) {  
    let updatedDashboard = false;  
    if (currentStatus != status) {  
      console.log("Status change detected");  
      handleStatusChanging(currentStatus, status);  
      currentStatus = status;  
      handleStatusChanged(currentStatus);  
      updatedDashboard = true;  
    }  

    let limit = getLimit();  
    if (currentLimit != limit) {  
      if (!updatedDashboard) {  
        // If the status didn't trigger an update, ensure we update when limit changes  
        sendDashboardData(false);  
        updatedDashboard = true;  
      }  
      currentLimit = limit;  
    }  
  }  
}  

/**  
 * Add a unique() method to Array prototype for convenience.  
 * @returns {Array} A new array with duplicate elements removed.  
 */  
Array.prototype.unique = function () {  
  var a = this.concat();  
  for (var i = 0; i < a.length; ++i) {  
    for (var j = i + 1; j < a.length; ++j) {  
      if (a[i] === a[j]) a.splice(j--, 1);  
    }  
  }  
  return a;  
};  

// On document ready, start the main timer to monitor game state changes  
$(document).ready(function () {  
  console.log("Live Roulette game window is loaded");  
  window.setInterval(mainTimer, 200);  
});  
