const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s, null, 2));
const printmj = s => console.log(JSON.stringify(s));
const $rdf = require("rdflib");

let store = $rdf.graph();
store.add(
    store.sym("http://example.org/#Alice"),
    store.sym("http://xmlns.com/foaf/0.1/knows"),
    store.sym("http://example.org/#Bob")
);
print($rdf.Serializer(store).statementsToXML(store.statementsMatching()));
//print($rdf.Serializer(store).statementsToN3(store.statementsMatching()));
