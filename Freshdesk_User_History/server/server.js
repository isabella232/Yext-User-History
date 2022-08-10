var request = require('request');

exports = {
  retrieveLogsData: function (data) {
    const options = {
        url: "https://api.yext.com/v2/accounts/me/logs/tables/analyticsEvents/query?api_key=" + data.iparams.logsApiKey + "&v=20220429",
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data["payload"])
    };
    request(options, function(err, res, body) {
        renderData(err, body);
    });
  }
};