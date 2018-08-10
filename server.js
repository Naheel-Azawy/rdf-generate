const express = require('express');
const bodyParser = require('body-parser');
const path = require("path");
const rdf_gen = require("./backend/rdf-gen.js");
const { exec } = require('child_process');
const formidable = require('formidable');
const fs = require('fs');

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

    req.body = JSON.parse(req.body.data);
		res.send(JSON.stringify(await rdf_gen({
        in_obj: req.body.json,
        init_base_obj: req.body.base_des,
        returned_value: "DES"
    })));

	  console.log("post to des");
});

//tell express what to do when the /form route is requested
app.post('/out', async (req, res) => {
	  res.setHeader('Content-Type', 'application/json');

    req.body = JSON.parse(req.body.data);
		res.send(JSON.stringify({ data: await rdf_gen({
        in_obj: req.body.json,
        init_base_obj: req.body.base_des,
        format: req.body.type,
        returned_value: "OUT"
    }) }));

	  console.log("post to out");
});

app.post('/fileupload', async (req, res) => {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        console.log(JSON.stringify(files, null, 2));
        var oldpath = files.filetoupload.path;
        var newpath = './aaa/' + files.filetoupload.name;
        exec(`mv '${oldpath}' '${newpath}'`, (err, stdout, stderr) => {
            if (err) throw err;
            res.end();
        });
    });
});

//wait for a connection
app.listen(PORT, function () {
    console.log('Server is running. Point your browser to: http://localhost:' + PORT);
});
