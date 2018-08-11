const express = require('express');
const bodyParser = require('body-parser');
const path = require("path");
const rdf_gen = require("./backend/rdf-gen.js");
const { exec } = require('child_process');
const formidable = require('formidable');
const fs = require('fs');

function start_server(args_port) {

    let port = args_port || process.env.PORT || 3000;

    let app = express();

    //support parsing of application/json type post data
    app.use(bodyParser.json());

    //support parsing of application/x-www-form-urlencoded post data
    app.use(bodyParser.urlencoded({ extended: true }));

    //tell express that www is the root of our public web folder
    app.use(express.static(path.join(__dirname, 'www')));

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
    app.listen(port, () => {
        console.log('Server is running. Point your browser to: http://localhost:' + port);
    });

}

function main(args) {

    args.server = args.server || args.s;

    if (args.server) {
        if (typeof(args.server) !== "number")
            args.server = undefined;
        start_server(args.server);
        return;
    }

    if (!args.in) args.in = args.i || args._[0];
    if (!args.out_descriptor) args.out_descriptor = args.d;
    if (!args.out_rdf) args.out_rdf = args.r;
    if (!args.init_base) args.init_base = args.b;
    if (!args.format) args.format = args.f;
    if (!args.format && args.out_rdf) args.format = args.out_rdf.split(".")[1] || "ttl";
    if (!args.api) args.api = args.a || "swoogle";

    if (args.help || args.h || !args.in || (!args.out_descriptor && !args.out_rdf)) {
        console.log(
            `Usage: node rdf-gen.js [OPTION]...
-s, --server                 start server
-i, --in=FILE                input file
-d, --out_descriptor=FILE    out descriptor file
-r, --out_rdf=FILE           out RDF file
-b, --init_base=FILE         initial descriptor json file used as a base for the generated descriptor
-f, --format=FORMAT          out RDF format (ttl, xml)
-a, --api=API                predicates finding API (lov, swoogle, test)
-h, --help                   display this help and exit

Example usage:
node rdf-gen.js -i simple.json -r simple-out.ttl -d simple-des.json --api swoogle
`);
        return;
    }

    rdf_gen(args);

}

main(require('minimist')(process.argv.slice(2)));
