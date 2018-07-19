const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

const writer = N3.Writer(process.stdout, { end: false, prefixes: { c: 'http://example.org/cartoons#' } });
let quads = [
    quad(
        namedNode('http://example.org/cartoons#Tom'),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('http://example.org/cartoons#Cat')
    ),
    quad(
        namedNode('http://example.org/cartoons#Tom'),
        namedNode('http://example.org/cartoons#name'),
        literal('Tom')
    )
];
for (let q of quads)
    writer.addQuad(q);
writer.end();
