var fs = require('fs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var json = JSON.parse(fs.readFileSync('src.json', 'utf8'));

function watson(keyword, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(JSON.parse(xmlHttp.responseText));
    };
    xmlHttp.open("GET", "http://watson.kmi.open.ac.uk/API/semanticcontent/keywords/?q=" + keyword.replace(" ", "+"), true);
    xmlHttp.setRequestHeader("Accept", "application/json");
    xmlHttp.send(null);
}

watson("follower", function (j) {
    console.log(j);
});

//while(true) { sleep(1000); }

//for (var a in json[0])
  //  console.log(a);


