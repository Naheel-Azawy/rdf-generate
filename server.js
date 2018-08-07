const express = require('express');
const bodyParser = require('body-parser');
const path = require("path");
const rdf_gen = require("./backend/rdf-gen.js");

const PORT = 3000;

let app = express();

//support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

//tell express that www is the root of our public web folder
app.use(express.static(path.join(__dirname, 'www')));

//tell express what to do when the /form route is requested
app.post('/des', async (req, res) => {
	  res.setHeader('Content-Type', 'application/json');

		res.send(JSON.stringify(await rdf_gen({ // FIXME: something wrong here
        in_str: req.body.json,
        init_base: req.body.base_des,
        returned_value: "DES"
    })));

	  console.log("post to des");
    //console.log(JSON.stringify(req.body, null, 2));
});

//tell express what to do when the /form route is requested
app.post('/out', async (req, res) => {
	  res.setHeader('Content-Type', 'application/json');

		res.send(JSON.stringify(await rdf_gen({
        in_str: req.body.json,
        init_base: req.body.base_des,
        format: req.body.type,
        returned_value: "OUT"
    })));

	  console.log("post to out");
    //console.log(JSON.stringify(req.body, null, 2));
});

//wait for a connection
app.listen(PORT, function () {
    console.log('Server is running. Point your browser to: http://localhost:' + PORT);
});