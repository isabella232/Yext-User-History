var client = ZAFClient.init();
client.invoke('resize', {
    width: '100%',
    height: '600px'
});

let autoFillSearchBar = false;

loadApp();

client.on('*.changed', function(data) {
    if (data["propertyName"] === "ticket.requester.email") {
        document.querySelector("#loading").style.display = '';
        document.querySelector("#content").style.display = 'none';
        document.querySelector("#no-data").style.display = 'none';
        removeAllChildNodes(document.querySelector("#all-user-history"));
        removeAllChildNodes(document.querySelector("#recent-searches"));
        removeAllChildNodes(document.querySelector("#recent-clicks"));
        loadApp();
    }
});

function loadApp() {
    client.metadata().then(function(metadata) {
        (function(d, script) {
            client.get('ticket.requester.email').then(function(data) {
                var requesterEmail = data["ticket.requester.email"];

                apiKey = metadata.settings["Logs API Key"];

                var body = {
                   "fields": ["session"],
                   "pageSize": 100,
                   "descending": true,
                   "filter": "visitor.id == '" + requesterEmail + "'"
                };

                var request = defineRequest(body);

                client.request(request).then(function(response) {
                    var logRecords = response["response"]["logRecords"];
                    if (logRecords === undefined) {
                        convertApiResponseToHtml(document, []);
                        return;
                      }
                    var sessionIds = new Set();
                    for (let i = 0; i < logRecords.length; i++) {
                        sessionIds.add(logRecords[i]["session"]);
                    }

                    body = {
                       "fields": ["visitor", "session"],
                       "pageSize": 100,
                       "descending": true,
                       "filter": "session in " + JSON.stringify([...sessionIds])
                    };

                    request = defineRequest(body);

                    client.request(request).then(function(response) {
                        logRecords = response["response"]["logRecords"];
                        sessionIds = new Set();
                        var visitorIds = new Set();
                        for (let i = 0; i < logRecords.length; i++) {
                            sessionIds.add(logRecords[i]["session"]);
                            var visitorId = logRecords[i]["visitor"]["id"];
                            if (visitorId != null) {
                                visitorIds.add(visitorId);
                            }
                        }

                        visitorIds.delete("undefined");
                        body = {
                           "fields": ["action", "answers.experienceKey", "answers.queryId", "eventTimestamp", "entityName", "destinationUrl", "rawSearchTerm"],
                           "pageSize": 100,
                           "descending": true,
                           "filter": "visitor.id in " + JSON.stringify([...visitorIds]) + " || session in " + JSON.stringify([...sessionIds])
                        };

                        request = defineRequest(body);

                        client.request(request).then(function(response) {
                            var history = response["response"]["logRecords"];

                            convertApiResponseToHtml(d, history);
                        }).catch(handleErr);
                    }).catch(handleErr);
                }).catch(handleErr); 
            });
        }(document));
    });
}

function defineRequest(body) {
    return {
        url: "https://api.yext.com/v2/accounts/me/logs/tables/analyticsEvents/query?api_key={{setting.logsApiKey}}&v=20220429",
        secure: true,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(body)
    };
}

function convertApiResponseToHtml(d, history) {
    let recentSearchCounter = 0;
    let recentClickCounter = 0;
    for (let i = 0; i < history.length; i++) {
        var listGroupItem = d.createElement("li");
        listGroupItem.className = "activity list-group-item";
        listGroupItem.style.display = 'none';
        var flex = d.createElement("div");
        flex.className = "d-flex w-100";
        var icon = d.createElement("img");
        icon.src = getSource(history[i]["action"]);
        var h5 = d.createElement("h5");
        h5.innerText = titleCase(history[i]["action"].replaceAll('_', ' '));
        h5.className = "blue";
        var small = d.createElement("small");
        small.className = "ms-auto";
        small.innerText = formatDate(history[i]["eventTimestamp"]);
        var p = null;
        if (history[i]["destinationUrl"] != null && history[i]["entityName"] != null) {
            p = d.createElement("a");
            p.innerText = history[i]["entityName"];
            p.href = history[i]["destinationUrl"];
            p.target = "_blank";
        } else if (history[i]["entityName"] != null) {
            p = d.createElement("p");
            p.innerText = history[i]["entityName"];
        } else {
            p = d.createElement("a");
            var em = d.createElement("em");
            em.innerText = '"' + history[i]["rawSearchTerm"] + '"';
            p.appendChild(em);
            p.href = buildSearchLogsUrl(history[i]["answers"]["experienceKey"], history[i]["answers"]["queryId"]);
            p.target = "_blank";
        }

        flex.appendChild(icon);
        flex.appendChild(h5);
        flex.appendChild(small);
        listGroupItem.appendChild(flex);
        listGroupItem.appendChild(p);
        var html = d.querySelector("#all-user-history");
        html.appendChild(listGroupItem);

        if (history[i]["action"] == "SEARCH" && recentSearchCounter < 5) {
            var li = d.createElement("li");
            li.className = "list-group-item";
            var a = d.createElement("a");
            a.className = "recent-search";
            var em = d.createElement("em");
            em.innerText = '"' + history[i]["rawSearchTerm"] + '"';
            a.appendChild(em);
            a.href = buildSearchLogsUrl(history[i]["answers"]["experienceKey"], history[i]["answers"]["queryId"]);
            a.target = "_blank";
            li.appendChild(a);
            var recentSearchHtml = d.querySelector("#recent-searches");
            recentSearchHtml.appendChild(li);
            recentSearchCounter++;
        } else if (history[i]["destinationUrl"] != null && history[i]["entityName"] != null && recentClickCounter < 5) {
            var li = d.createElement("li");
            li.className = "list-group-item";
            var a = d.createElement("a");
            a.className = "recent-click";
            a.innerText = history[i]["entityName"];
            a.href = history[i]["destinationUrl"];
            a.target = "_blank";
            var recentClickHtml = d.querySelector("#recent-clicks");
            li.appendChild(a);
            recentClickHtml.appendChild(li);
            recentClickCounter++;
        }
    }
    if (recentSearchCounter == 0) {
        var li = d.createElement("li");
        li.className = "list-group-item";
        li.innerText = "No recent queries have been captured for this requester";
        var recentSearchHtml = d.querySelector("#recent-searches");
        recentSearchHtml.appendChild(li);
    }
    if (recentClickCounter == 0) {
        var li = d.createElement("li");
        li.className = "list-group-item";
        li.innerText = "No recent clicks have been captured for this requester";
        var recentSearchHtml = d.querySelector("#recent-clicks");
        recentSearchHtml.appendChild(li);
    }
    if (history.length == 0) {
        var li = d.createElement("li");
        li.className = "list-group-item";
        li.innerText = "No recent activity has been captured for this requester";
        var recentSearchHtml = d.querySelector("#all-user-history");
        recentSearchHtml.appendChild(li);
        d.querySelector("#no-data").style.display = '';
        d.querySelector("#loading").style.display = 'none';
        d.querySelector("#content").style.display = 'none';
        return;
    }
    showMore();
    $("#show-more").click(function(){
        showMore();
    });
    d.querySelector("#no-data").style.display = 'none';
    d.querySelector("#loading").style.display = 'none';
    d.querySelector("#content").style.display = '';
}

function buildSearchLogsUrl(experienceKey, queryId) {
    return "https://www.yext.com/s/me/answers/experiences/" + experienceKey + "/searchQueryLogDetails/" + queryId;
}

function getSource(action) {
    return "blue/" + action.toLowerCase() + '_blue.svg';
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
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

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
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
    console.error(err);
}
