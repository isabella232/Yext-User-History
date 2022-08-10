document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();

  function renderApp() {
    var onInit = app.initialized();

    onInit.then(getClient).catch(handleErr);

    function getClient(_client) {
      window.client = _client;
      client.events.on('app.activated', onAppActivate);
    }
  }
};

var recentSearchCounter = 0;
var recentClickCounter = 0;

function onAppActivate() {
  resize();
  populateConsumerHistory();
}

function resize() {
  client.instance.resize({
    height: "700px"
  });
}

function populateConsumerHistory() {
  client.iparams.get().then(firstApiAttempt).catch(handleErr);
}

function firstApiAttempt() {
  client.data.get("requester").then(function(data) {
    var body = { 
      "payload": {
         "fields": ["visitor", "session"],
         "pageSize": 100,
         "descending": true,
         "filter": "visitor.id.containsAnyCase('" + data.requester["email"] + "')"
      }
    };

    client.request.invoke("retrieveLogsData", body).then(secondApiAttempt).catch(handleErr);      
  }).catch(handleErr);
}

function secondApiAttempt(data) {
  var logRecords = JSON.parse(data.response)["response"]["logRecords"];
  if (logRecords === undefined) {
    convertApiResponseToHtml(document, []);
    return;
  }
  var sessionIds = new Set();
  var visitorIds = new Set();
  for (let i = 0; i < logRecords.length; i++) {
      sessionIds.add(logRecords[i]["session"]);
      var visitorId = logRecords[i]["visitor"]["id"];
      if (visitorId != null) {
          if (visitorId.includes("&")){
              var visitorSplit = visitorId.split("&");
              visitorIds.add(visitorSplit[0]);
              visitorIds.add(visitorSplit[1]);
          }
          visitorIds.add(visitorId);
      }
  }

  visitorIds.delete("undefined");
  var body = {
    "payload": {
      "fields": ["action", "eventTimestamp", "answers.experienceKey", "answers.queryId","entityName", "destinationUrl", "rawSearchTerm"],
      "pageSize": 100,
      "descending": true,
      "filter": "visitor.id in " + JSON.stringify([...visitorIds]) + " || session in " + JSON.stringify([...sessionIds])
    }
  };

  client.request.invoke("retrieveLogsData", body).then(convertApiResponseToHtml).catch(handleErr);  ;
}

function convertApiResponseToHtml(data) {
    var history = [];
    if (data.response !== undefined) {
      var response = JSON.parse(data.response);
      var history = response["response"]["logRecords"];
      if (history === undefined) {
        history = [];
      }
    }
    for (let i = 0; i < history.length; i++) {
      convertIndividualLogToHtml(history[i]);
    }
    if (recentSearchCounter == 0) {
      var li = document.createElement("li");
      li.className = "list-group-item";
      li.innerText = "No recent queries have been captured for this requester";
      var recentSearchHtml = document.querySelector("#recent-searches");
      recentSearchHtml.appendChild(li);
    }
    if (recentClickCounter == 0) {
      var li = document.createElement("li");
      li.className = "list-group-item";
      li.innerText = "No recent clicks have been captured for this requester";
      var recentSearchHtml = document.querySelector("#recent-clicks");
      recentSearchHtml.appendChild(li);
    }
    if (history.length == 0) {
      var li = document.createElement("li");
      li.className = "list-group-item";
      li.innerText = "No recent activity has been captured for this requester";
      var recentSearchHtml = document.querySelector("#all-user-history");
      recentSearchHtml.appendChild(li);
      document.querySelector("#loading").style.display = 'none';
      document.querySelector("#content").style.display = 'none';
      document.querySelector("#no-data").style.display = '';
      return;
    }
    showMore();
    $("#show-more").click(function(){
      showMore();
    });
    document.querySelector("#loading").style.display = 'none';
    document.querySelector("#no-data").style.display = 'none';
    document.querySelector("#content").style.display = '';
}

function convertIndividualLogToHtml(log) {
  var listGroupItem = document.createElement("li");
  listGroupItem.className = "activity list-group-item";
  listGroupItem.style.display = 'none';
  var flex = document.createElement("div");
  flex.className = "d-flex w-100";
  var icon = document.createElement("img");
  icon.src = getSource(log["action"]);
  var h5 = document.createElement("h5");
  h5.innerText = titleCase(log["action"].replaceAll('_', ' '));
  h5.className = "blue";
  var small = document.createElement("small");
  small.className = "ms-auto";
  small.innerText = formatDate(log["eventTimestamp"]);
  var p = formatActivityDescription(log);

  flex.appendChild(icon);
  flex.appendChild(h5);
  flex.appendChild(small);
  listGroupItem.appendChild(flex);
  listGroupItem.appendChild(p);
  var html = document.querySelector("#all-user-history");
  html.appendChild(listGroupItem);

  if (log["action"] == "SEARCH" && recentSearchCounter < 5) {
    appendToRecentSearches(log);
    recentSearchCounter++;
  } else if (log["destinationUrl"] != null && log["entityName"] != null && recentClickCounter < 5) {
    appendToRecentClicks(log);
    recentClickCounter++;
  }
}

function formatActivityDescription(log) {
  var p = null;
  if (log["destinationUrl"] != null && log["entityName"] != null) {
    p = document.createElement("a");
    p.innerText = log["entityName"];
    p.href = log["destinationUrl"];
    p.target = "_blank";
  } else if (log["entityName"] != null) {
    p = document.createElement("p");
    p.innerText = log["entityName"];
  } else {
    p = document.createElement("a");
    var em = document.createElement("em");
    em.innerText = '"' + log["rawSearchTerm"] + '"';
    p.appendChild(em);
    p.href = buildSearchLogsUrl(log["answers"]["experienceKey"], log["answers"]["queryId"]);
    p.target = "_blank";
  }
  return p;
}

function appendToRecentSearches(log) {
  var li = document.createElement("li");
  li.className = "list-group-item";
  var a = document.createElement("a");
  a.className = "recent-search";
  var em = document.createElement("em");
  em.innerText = '"' + log["rawSearchTerm"] + '"';
  a.appendChild(em);
  a.href = buildSearchLogsUrl(log["answers"]["experienceKey"], log["answers"]["queryId"]);
  a.target = "_blank";
  li.appendChild(a);
  var recentSearchHtml = document.querySelector("#recent-searches");
  recentSearchHtml.appendChild(li);
}

function appendToRecentClicks(log) {
  var li = document.createElement("li");
  li.className = "list-group-item";
  var a = document.createElement("a");
  a.className = "recent-click";
  a.innerText = log["entityName"];
  a.href = log["destinationUrl"];
  a.target = "_blank";
  li.appendChild(a);
  var recentClickHtml = document.querySelector("#recent-clicks");
  li.appendChild(a);
  recentClickHtml.appendChild(li);
}

function buildSearchLogsUrl(experienceKey, queryId) {
    return "https://www.yext.com/s/me/answers/experiences/" + experienceKey + "/searchQueryLogDetails/" + queryId;
}

function getSource(action) {
    return 'styles/images/blue/' + action.toLowerCase() + '_blue.svg';
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString().replace(", ", "\n");
}

function titleCase(str) {
  return str.toLowerCase().split(' ').map(function(word) {
    if (word === "cta") {
        return word.toUpperCase();
    }
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
}

function showMore() {
    var activities = document.querySelectorAll(".activity");
    var hiddenActivities = [...activities].filter(n => n.style.display === 'none');
    for (let i = 0; i < hiddenActivities.length && i < 10; i++) {
      hiddenActivities[i].style.display = '';
    }
    if (hiddenActivities.length < 10) {
      document.querySelector("#show-more").style.display = 'none';
    } else {
      document.querySelector("#show-more").style.display = '';
    }
}

function handleErr(err) {
  if (err.status === 401) {
      document.querySelector("#loading-title").innerText = "Error loading data: Invalid API Key.";
  } else if (err.status === 429) {
      document.querySelector("#loading-title").innerText = "Error loading data : Too Many Request. Contact Yext Support to Increase API Quota.";
  } else {
      document.querySelector("#loading-title").innerText = "Error loading data" ;
  }
  document.querySelector("#loading-icon").style.display = 'none';
  document.querySelector("#content").style.display = 'none';
  client.interface.trigger("showNotify", {
      type: "warning", 
      message: "Please check your Yext User History configuration and refresh the page"
    }).catch(console.error(err));
}
