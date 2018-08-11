const $rdf = require("rdflib");

var uri = 'https://example.org/resource.ttl';
var body = '<a> <b> <c> . <d> <e> <f> .';
var mimeType = 'text/turtle'; // application/rdf+xml
var store = $rdf.graph();

try {
    $rdf.parse(body, store, uri, mimeType);
    //let s = store.serialize("application/json-ld");
    var stms = store.statementsMatching(undefined, undefined , undefined);
    console.log(stms);
} catch (err) {
    console.log(err);
}
