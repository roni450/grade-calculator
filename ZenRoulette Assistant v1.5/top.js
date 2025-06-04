var playData = [];
var allSessions = 0;
var winSessions = 0;

let loggedIn = false;

chrome.storage.local.get(["authenticated", "securityToken", "loginTime", "email", "membership"], (data) => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (data.authenticated && data.securityToken && now - data.loginTime <= oneDay) {
    loggedIn = true;
    showDashboard();
    $('#zrr-membership').html(`
      <div>${data.email}</div>
      <div>${data.membership === 'trial' ? 'Trial Membership' : 'ZRR Membership'}</div>
    `);
    toggleLogin();
  } else {
    chrome.storage.local.clear();
    showDashboard(); // load dashboard without login
  }
});


/**
 * Create dashboard
 * 
 * @returns 
 */
function showDashboard() {
  if (document.getElementById('zrr-dashboard') != null) {
    return;
  }
  var div = document.createElement("div");
  div.id = 'zrr-dashboard';
  div.style.zIndex = 9999;
  div.style.position = 'absolute';
  div.style.left = '0';
  div.style.top = '0';
  div.style.height = '100%';
  div.style.width = '280px';
  div.style.backgroundColor = 'black';
  // div.style.opacity = '0.8';
  //div.style.paddingTop = '40px';
  div.style.marginTop = '1px';
  div.style.borderRight = '1px solid white';
  div.style.borderTop = '1px solid white';
  // div.style.fontWeight = "bold";
  div.style.fontFamily = "Arial";
  div.style.fontSize = '18px';
  document.body.appendChild(div);

  var html = `
    <div style='padding: 8px;' id='zrr-login-container'>
      <div style='padding: 8px; text-align: center; color: yellow'>ZenRoulette Login</div>
      <div id='zrr-login-error'></div>
      <div style='padding: 8px; text-align: center;'>Email:</div>
      <div><input type="text" name="zrr-email" id="zrr-email" style='width: 100%; font-size: 16px; color: #28A745; padding: 4px;' /></div>
      <div style='text-align: center; padding: 8px;'>Password:</div>
      <div><input type="password" name="zrr-password" id="zrr-password" style='width: 100%; font-size: 16px; color: #28A745; padding: 4px;' /></div>
      <div style='text-align: center; padding: 16px;'>
<div>
  <input type="submit"
         name="zrr-login-btn"
         id="zrr-login-btn"
         value="Login"
         style="font-size: 16px; padding: 4px; width: 70px;
                background-color: #007BFF; /* Blue background */
                color: #FFFFFF;            /* White text */
                border: none;
                border-radius: 4px;" />
  
  <input type="submit"
         name="zrr-signup-btn"
         id="zrr-signup-btn"
         value="SignUp"
         style="font-size: 16px; padding: 4px; width: 70px;
                background-color: #28A745; /* Green background */
                color: #FFFFFF;            /* White text */
                border: none;
                border-radius: 4px;" />
</div>

      </div>
    </div>
    <div id='zrr-info-container'>
      <div id='zrr-membership' style='padding: 8px; text-align: center; color: yellow'></div>
      <div style='width:100%; padding:4px'>
        <span style='color: green'>Favorite Nr:</span>
        <span id='zrr-favorite-numbers'></span>
      </div>
      <div style='width:100%; padding:4px'>
        <span style='color: green'>Last five: ...</span>
        <span id='zrr-last-five-numbers'></span>
      </div>
      <div style='color:white; padding:4px' id='zrr-recommendation'></div>
      <div style='color:white; padding:4px' id='zrr-bet-numbers'></div>
      <div style='color:white; padding:4px; font-size:16px; text-align:center' id='zrr-high-stake-numbers'></div>
      <div style="display: flex; flex-direction: column;align-items: center; margin-top: 8px;">
        <div id="zrr-statistics" style="width: 240px; background-color:#2b741b; height: 240px; border-top-left-radius: 50%; border-top-right-radius: 50%;">
          <canvas id="canvas" width="220" height="220" style='margin-left:10px; margin-top:10px;z-index:1000'></canvas>
        </div>
        <div style="background-color:#2b741b;width: 240px;border-bottom-left-radius:16px;border-bottom-right-radius:16px;color:black">
          <div style='width:100%; text-align:center; padding: 8px; font-size:16px; font-weight:bold;'>STATISTICS</div>
          <div id='zrr-dealer-container' style='width:100%; text-align:center; padding: 4px; font-size:14px;'>Dealer session: <span id='zrr-dealer-name'></span></div>
          <div style='width:100%; text-align:center; padding: 8px; font-size:14px; font-weight:bold;'>Last 4 hands:</div>
          <div id='zrr-play-information'>
          </div>
          <div style='width:100%;display:flex; padding-top: 16px; padding-bottom: 24px;'>
            <button id='zrr-save-stats' style='flex:1;margin:6px; font-size:10px; padding: 8px; background-color:black;color:white;box-shadow: -2px 4px 4px #888383;border: 1px solid white;'>SAVE STATS</button>
            <button id='zrr-reset-stats' style='flex:1;margin:6px; font-size:10px; padding: 8px; background-color:black;color:white;box-shadow: -2px 4px 4px #888383;border: 1px solid white;'>RESET STATS</button>
          </div>
        </div>
      </div>
    </div>
  `;

  div.innerHTML = html;

  drawRouletteWheel();

  document.getElementById('zrr-signup-btn').onclick = signupZRR;
  document.getElementById('zrr-login-btn').onclick = loginZRR;

  document.getElementById('zrr-save-stats').onclick = saveStatus;
  document.getElementById('zrr-reset-stats').onclick = resetStatus;

  toggleLogin();
}

/**
 * Get color of the specified number
 * 
 * @param {*} n : number
 * @returns color
 */
function getColorFromNumber(n) {
  mapColors =
    [
      "green",    // 0
      "red",      // 1
      "black",    // 2
      "red",      // 3
      "black",    // 4
      "red",      // 5
      "black",    // 6
      "red",      // 7
      "black",    // 8
      "red",      // 9
      "black",    // 10
      "black",    // 11
      "red",      // 12
      "black",    // 13
      "red",      // 14
      "black",    // 15
      "red",      // 16
      "black",    // 17
      "red",      // 18
      "red",      // 19
      "black",   // 20
      "red",      // 21
      "black",    // 22
      "red",      // 23
      "black",    // 24
      "red",      // 25
      "black",    // 26
      "red",      // 27
      "black",    // 28
      "black",    // 29
      "red",      // 30
      "black",    // 31
      "red",      // 32
      "black",    // 33
      "red",      // 34
      "black",    // 35
      "red"       // 36
    ];
  return mapColors[n] == 'black' ? 'white' : mapColors[n];
}

/**
 * Update dashboard
 * 
 * @param {*} msg : object that has information to be shown in dashboard
 */
function updateDashboard(msg) {
  var strNumbers = "";

  console.log("update dashboard");
  recentNumbers = msg.recentNumbers;
  favoriteNumbers = msg.favoriteNumbers;
  betFavorites = msg.betFavorites;
  highStakeNumbers = msg.highStakeNumbers;
  dealer = msg.dealer;

  // update recent numbers
  for (i = 0; i < 5; i++) {
    if (strNumbers != "") {
      strNumbers += " ";
    }
    strNumbers += "<span style='color:" + getColorFromNumber(recentNumbers[i]) + "'>" + recentNumbers[i] + "</span>";
  }
  document.getElementById('zrr-last-five-numbers').innerHTML = strNumbers;

  // update favorite numbers
  strNumbers = "";
  for (i = 0; i < 5; i++) {
    if (strNumbers != "") {
      strNumbers += " ";
    }
    strNumbers += "<span style='color:" + getColorFromNumber(favoriteNumbers[i]) + "'>" + favoriteNumbers[i] + "</span>";
  }
  document.getElementById('zrr-favorite-numbers').innerHTML = strNumbers;

  clearAll();

  // update recommendation
  if (betFavorites == null) {
    document.getElementById('zrr-recommendation').innerHTML = "We recommend to stay this round!";
    document.getElementById('zrr-bet-numbers').style.display = "none";
    document.getElementById('zrr-high-stake-numbers').innerHTML = "";
  }
  else {
    document.getElementById('zrr-recommendation').innerHTML = "ZenRoulette Recommendation";
    document.getElementById('zrr-bet-numbers').style.display = "";
    html = "";
    for (i = 0; i < betFavorites.length; i++) {
      if (i == 0) {
        div_html = `<div style='font-size:16px'><span style='font-size:18px'>BET: </span><span style='color:${getColorFromNumber(betFavorites[i])}'>${betFavorites[i]} </span><span>and 3 neighborhood</span></div>`;
      }
      else {
        div_html = `<div style='font-size:16px'><span style='padding-left:44px;color:${getColorFromNumber(betFavorites[i])}'>${betFavorites[i]} </span><span>and 3 neighborhood</span></div>`;
      }
      html += div_html;

      draw3Neighborhood(betFavorites[i]);
    }
    document.getElementById('zrr-bet-numbers').innerHTML = html;

    // update high stake numbers
    html = "<span>High stake numbers: </span>";
    if (highStakeNumbers != null) {
      for (i = 0; i < highStakeNumbers.length; i++) {
        html += `<span style='color:${getColorFromNumber(highStakeNumbers[i])}'>${highStakeNumbers[i]} </span>`;
        drawHighStakeNumber(highStakeNumbers[i]);
      }
    }
    document.getElementById('zrr-high-stake-numbers').innerHTML = html;
  }

  // update dealer
  let spanDealer = document.getElementById('zrr-dealer-name');
  if (spanDealer.innerHTML != dealer) {
    $('#zrr-dealer-container').effect("highlight", { color: 'orange' }, 3000);
  }
  spanDealer.innerHTML = dealer;
}
var numbers = ["0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27", "13", "36", "11", "30", "8", "23", "10", "5", "24", "16", "33", "1", "20", "14", "31", "9", "22", "18", "29", "7", "28", "12", "35", "3", "26"];

var colors = ["green", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242", "#e0232a", "#424242"];

var startAngle = Math.PI / 2;
var arc = Math.PI / 37 * 2;
var ctx;

function drawRouletteWheel() {
  var canvas = document.getElementById("canvas");
  if (canvas.getContext) {
    var outsideRadius = canvas.width / 2 - 2;
    var textRadius = 93;
    var insideRadius = 80;

    ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 500, 500);


    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    ctx.font = '10px Helvetica, Arial';

    for (var i = 0; i < numbers.length; i++) {
      var angle = startAngle + i * arc;
      ctx.fillStyle = colors[i];

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.width / 2, outsideRadius, angle, angle + arc, false);
      ctx.arc(canvas.width / 2, canvas.width / 2, insideRadius, angle + arc, angle, true);
      ctx.stroke();
      ctx.fill();

      ctx.save();
      ctx.shadowOffsetX = -1;
      ctx.shadowOffsetY = -1;
      ctx.shadowBlur = 0;
      //ctx.shadowColor   = "rgb(220,220,220)";
      ctx.fillStyle = "white";
      ctx.translate(canvas.width / 2 + Math.cos(angle + arc / 2) * textRadius,
        canvas.width / 2 + Math.sin(angle + arc / 2) * textRadius);
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      var text = numbers[i];
      ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
      ctx.restore();
    }
    clearAll();

  }
}

function draw3Neighborhood(n) {
  var canvas = document.getElementById("canvas");
  if (canvas.getContext) {
    let insideRadius = 80;
    let idx = numbers.indexOf(n);
    let start_angle = startAngle + idx * arc;
    ctx.strokeStyle = "#a862bb";
    ctx.fillStyle = "#a862bb";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.width / 2);
    ctx.arc(canvas.width / 2, canvas.width / 2, insideRadius, start_angle - 3 * arc, start_angle + 4 * arc);
    ctx.lineTo(canvas.width / 2, canvas.width / 2);
    ctx.stroke();
    ctx.fill();
  }
}

function drawHighStakeNumber(n) {
  var canvas = document.getElementById("canvas");
  if (canvas.getContext) {
    let insideRadius = 80;
    let idx = numbers.indexOf(n);
    let start_angle = startAngle + idx * arc;
    ctx.strokeStyle = "#3399FF";
    ctx.fillStyle = "#3399FF";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.width / 2);
    ctx.arc(canvas.width / 2, canvas.width / 2, insideRadius, start_angle - 0 * arc, start_angle + 1 * arc);
    ctx.lineTo(canvas.width / 2, canvas.width / 2);
    ctx.stroke();
    ctx.fill();
  }
}

function clearAll() {
  var canvas = document.getElementById("canvas");
  if (canvas.getContext) {
    let insideRadius = 80;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.width / 2, insideRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Update playing data shown on dashboard
 * 
 * @param {*} msg 
 */
function updatePlayInformation(msg) {
  if (msg.win && msg.favorite) {
    playData.push({
      playTime: msg.playTime,
      dealer: msg.dealer,
      playRound: msg.playRound,
      betOn: msg.betOn,
      winner: msg.winner,
      win: msg.win,
      favorite: true
    });
  }
  else {
    playData.push({
      playTime: msg.playTime,
      dealer: msg.dealer,
      playRound: msg.playRound,
      betOn: msg.betOn,
      winner: msg.winner,
      win: msg.win,
      favorite: false
    });
  }

  allSessions++;
  if (msg.win) {
    winSessions++;
  }

  var html = '';
  var count = 0;
  for (var i = playData.length - 1; i >= 0; i--, count++) {
    if (count == 4) {
      break;
    }
    let showFavorite = (playData[i].favorite) ? '(Hit Favorite Number)' : '';
    var color = getColorFromNumber(playData[i].winner);
    if (color == 'green') {
      color = '#FFFF99';
    }
    let div_html = `<div style='width:100%;display:flex; font-size:14px'><span style='flex:1; text-align:right; font-weight:bold; color:${color}'>${playData[i].winner}</span><span style='flex:4; margin-left:4px'> - ${playData[i].win ? 'WIN' : 'LOSS'} ${showFavorite}</span></div>`;
    html += div_html;
  }
  html += `
    <div style='width:100%; text-align:center; padding-top: 8px; font-size:14px; font-weight:bold;'>Session play</div>
    <div style='width:100%; text-align:center; padding-top: 8px; font-size:14px; font-weight:bold;color:white'>${allSessions}</div>
    <div style='width:100%;display:flex; padding-top: 8px; font-size:14px'><span style='flex:1; text-align:right; font-weight:bold'>Session WIN | </span><span style='flex:1; margin-left:4px; font-weight:bold'>Session LOSS</span></div>
    <div style='width:100%;display:flex; padding-top: 8px; font-size:14px; color:white'><span style='flex:1'></span><span style='flex:5; text-align:center; font-weight:bold'>${winSessions}</span><span style='flex:5; text-align:center; margin-left:4px; font-weight:bold'>${allSessions - winSessions}</span><span style='flex:1'></span></div>
  `;
  document.getElementById('zrr-play-information').innerHTML = html;
}

/**
 * Clear playing data shown on dashboard
 */
function clearPlayInformation() {
  document.getElementById('zrr-play-information').innerHTML = '';
}

/**
 * Show/Hide dashboard
 */
function toggleDashboard() {
  let dashboard = document.getElementById('zrr-dashboard');
  if (dashboard == null) {
    showDashboard();
  }
  else {
    if (dashboard.style.display == 'none') {
      dashboard.style.display = '';
    }
    else {
      dashboard.style.display = 'none';
    }
  }
}

/**
 * Save statistics
 */
function saveStatus() {
  chrome.runtime.sendMessage({
    type: "save-stats",
    playData: playData
  });
}

/**
 * Reset statistics
 */
function resetStatus() {
  playData = [];
  clearPlayInformation();
}

function signupZRR() {
  window.open('https://www.zenroulette.com/');
}

async function loginZRR() {
  let email = $('#zrr-email').val();
  let password = $('#zrr-password').val();

  if (!email || !password) {
    $('#zrr-login-error').html(`
      <div style='padding: 8px; color:orangered; text-align: center'>Please enter both email and password.</div>
    `);
    return;
  }

  try {
    let msg = await chrome.runtime.sendMessage({
      type: "api",
      data: {
        action: "auth",
        email: email,
        password: password
      }
    });

    if (msg.success === true) {
      loggedIn = true;

      await chrome.storage.local.set({
        authenticated: true,
        securityToken: msg.token,
        email: msg.email,
        membership: msg.membership,
        loginTime: Date.now()
      });

      $('#zrr-membership').html(`
        <div>${email}</div>
        <div>${msg.membership === 'trial' ? 'Trial Membership' : 'ZRR Membership'}</div>
      `);
      $('#zrr-login-error').html('');
      toggleLogin();
    } else {
      $('#zrr-login-error').html(`
        <div style='padding: 8px; color:orangered; text-align: center'>${msg.msg || 'Login failed.'}</div>
      `);
    }
  } catch (e) {
    $('#zrr-login-error').html(`
      <div style='padding: 8px; color:orangered; text-align: center'>Login failed: ${e.message || 'Unknown error occurred.'}</div>
    `);
  }
}



function toggleLogin() {
  let loginContainer = document.getElementById('zrr-login-container');
  // let infoContainer = document.getElementById('zrr-info-container');
  if (loggedIn) {
    loginContainer.style.display = 'none';
    // infoContainer.style.display = '';
  }
  else {
    loginContainer.style.display = '';
    // infoContainer.style.display = 'none';
  }
}

/**
 * 
 */
$(document).ready(function () {

  console.log('Live Roulette top window is loaded');

  chrome.runtime.onMessage.addListener(msg => {
    console.log("top message");
    if (msg.type == 'update-dashboard') {
      console.log("top / update-dashboard");
      showDashboard();
      updateDashboard(msg);
    }
    else if (msg.type == 'update-play') {
      console.log("top / update-play");
      updatePlayInformation(msg);
    }
    else if (msg.type == 'toggle') {
      console.log("toggle");
      toggleDashboard();
    }
    else if (msg.type == 'logout') {
      console.log("logout");
      loggedIn = false;
      playData = [];
      allSessions = 0;
      winSessions = 0;
      toggleLogin();
    }
  });
});
