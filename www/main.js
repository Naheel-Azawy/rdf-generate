
let des;
let newDes;
let filteredDes;

let editor;
let out;

let step = 0;
const STEPS = 4;

main();

const print = s => console.log(s);
const printj = s => console.log(JSON.stringify(s, null, 2));

function shallowClone(o) {
    return Object.assign({}, o);
}

function deepClone(o) {
    return o ? JSON.parse(JSON.stringify(o)) : undefined;
}

async function main() {
    setupJsonEditor();
    setStep(0);
}

function createEditor(container) {
    let editor = ace.edit(container);
    editor.setTheme("ace/theme/ambiance");
    editor.session.setMode("ace/mode/xml");
    editor.session.setOption("useWorker", false);
    editor.setReadOnly(true);
    return editor;
}

function createJsonEditor(container) {
    let editor = createEditor(container);
    editor.session.setMode("ace/mode/json");
    editor.session.setOption("useWorker", true);
    editor.setReadOnly(false);
    editor.set = s => editor.setValue(JSON.stringify(s, null, 2), 1);
    editor.get = () => JSON.parse(editor.getValue());
    return editor;
}

function setupJsonEditor() {
    editor = createJsonEditor("jsoneditor");
    editor.set(FAKE_INPUT); // TODO: remove later (just for testing)
}

function addTable(template, headerTemplate, content) {
    document.getElementById("entityTable").innerHTML = headerTemplate;
    document.getElementById("tableHolder").innerHTML = Handlebars.compile(template)(content);
}

// ENTITIES ----------------------------------------------

function addEntitiesTable(e) {
    addTable(ENTITIES_TABLE_TEMPLATE, ENTITIES_HEADER_TEMPLATE, e);
}

async function addEntity() {
    const formTemplate = Handlebars.compile(ADD_ENTITY_TEMPLATE);
    let dialogTitle = "Add Entity";
    let entityDialog = document.querySelector('#entity-dialog');
    entityDialog.innerHTML = formTemplate({dialogTitle});
    entityDialog.showModal();
}

function closeEntityDialog() {
    document.querySelector('#entity-dialog').close();
}

// TODO: entity onchange

function checkEntities() {
    if (!newDes)
        newDes = {};
    if (!newDes.entities)
        newDes.entities = deepClone(des.entities);
}

function setEntityInput() {
    let entity_name = document.getElementById('entity_name');
    let json_path = document.getElementById('json_path');
    let include = document.getElementById('include');
    let type = document.getElementById('type');
    let iri_template = document.getElementById('iri_template');
    let inc;
    try {
        inc = JSON.parse(include.value);
        // TODO: check the user input
    } catch (err) {
        inc = [include.value];
    }
    checkEntities();
    newDes.entities[json_path.value] = {
        name: entity_name.value,
        include: inc,
        type: type.value,
        iri_template: iri_template.value
    };
    closeEntityDialog();
    addEntitiesTable(newDes.entities);
}

function onEntityChange(input, path, prop) {
    checkEntities();
    if (!newDes.entities[path])
        newDes.entities[path] = {};
    newDes.entities[path][prop] = input.value;
}

// PROPERTIES ---------------------------------------------

function addPropertiesTable() {
    // Grouping the properties under the entities
    let e = deepClone(newDes.entities);
    let s = shallowClone(des.struct);
    for (let base of Object.keys(e)) {
        if (!e[base].properties) e[base].properties = {};
        for (let p of Object.keys(s)) {
            if (s[p] && p.startsWith(base)) {
                e[base].properties[p] = s[p];
                s[p] = undefined;
            }
        }
        if (Object.keys(e[base].properties).length === 0) {
            delete e[base];
        }
    }
    addTable(PROPERTIES_TABLE_TEMPLATE, PROPERTIES_HEADER_TEMPLATE, e);
}

function addPropertiesTable1() {
    // Grouping the properties under the entities
    let e = deepClone(newDes.entities);
    let s = shallowClone(des.struct);
    for (let p of Object.keys(s)) {
        for (let base of Object.keys(e)) {
            if (!e[base].properties) e[base].properties = {};

            let p_base = p;
            do {
                p_base = p_base.split(".");
                p_base.pop();
                p_base = p_base.join(".");

                print(`${p_base} ${base}`);

                if (s[p] && p_base === base) {
                    e[base].properties[p] = s[p];
                    s[p] = undefined;
                    break;
                }
            } while (p_base);

            if (Object.keys(e[base].properties).length === 0) {
                delete e[base];
            }
        }
    }
    addTable(PROPERTIES_TABLE_TEMPLATE, PROPERTIES_HEADER_TEMPLATE, e);
}

function checkPropObj() {
    if (!filteredDes) filteredDes = {};
    if (!filteredDes.entities) filteredDes.entities = (newDes || des).entities;
    if (!filteredDes.struct) filteredDes.struct = {};
}

function setPropPrefixes() {
    checkPropObj();
    filteredDes.prefixes = {};
    for (let k of Object.keys(filteredDes.struct)) {
        let p = filteredDes.struct[k].suggested_predicates[0];
        filteredDes.prefixes[p.prefix_name] = des.prefixes[p.prefix_name];
    }
}

function onDataTypeChange(sel, path) {
    checkPropObj();
    if (!filteredDes.struct[path])
        filteredDes.struct[path] = {};
    filteredDes.struct[path].data_types = [des.struct[path].data_types[sel.value]];
}

function onPredChange(sel, path) {
    checkPropObj();
    if (!filteredDes.struct[path])
        filteredDes.struct[path] = {};
    if (sel.value == des.struct[path].suggested_predicates.length) {
        print("TODO: add a predicate dialog");
        return;
    }
    filteredDes.struct[path].suggested_predicates = [des.struct[path].suggested_predicates[sel.value]];
}

// FINAL -------------------------------------------------

function addFinalContainer(out) {
    document.getElementById("entityTable").innerHTML = FINAL_HEADER_TEMPLATE;
    document.getElementById("tableHolder").innerHTML = FINAL_TEMPLATE;
    createJsonEditor("desEditor").set(filteredDes);
    createEditor("outEditor").setValue(out, 1);
}

async function next() {
    if (step < STEPS) ++step;
    await setStep(step);
}

async function prev() {
    if (step > 0) --step;
    await setStep(step);
}

async function setStep(i) {
    switch (i) {
    case 0:
        document.getElementById("nextBtn").innerHTML = "NEXT";
        document.getElementById("prevBtn").style.display = "none";
        document.getElementById("finalDestination").innerHTML = "";
        document.getElementById("entityTable").innerHTML = THE_DRAMATIC_INTRO;
        break;
    case 1: // Entities
        des = await getDescriptor(editor.get()[0], undefined);
        document.getElementById("nextBtn").innerHTML = "NEXT";
        document.getElementById("prevBtn").style.display = "inline-block";
        document.getElementById("finalDestination").innerHTML = "";
        document.getElementById("desContainer").style["overflow-y"] = "scroll";
        addEntitiesTable(des.entities);
        break;
    case 2: // Properties
        checkEntities();
        des = await getDescriptor(editor.get()[0], newDes);
        document.getElementById("nextBtn").innerHTML = "NEXT";
        document.getElementById("prevBtn").style.display = "inline-block";
        document.getElementById("finalDestination").innerHTML = "";
        document.getElementById("desContainer").style["overflow-y"] = "scroll";
        delete des.struct["$"];
        addPropertiesTable();
        break;
    case 3: // FINAL
        setPropPrefixes();
        out = await getOutput(editor.get()[0], filteredDes, "ttl");
        document.getElementById("nextBtn").innerHTML = "CONVERT";
        document.getElementById("prevBtn").style.display = "inline-block";
        document.getElementById("finalDestination").innerHTML = FINAL_STUFF;
        document.getElementById("desContainer").style["overflow-y"] = "hidden";
        addFinalContainer(out);
        let formatRadioBtns = document.getElementsByName("formatRadio");
        for (let b of formatRadioBtns) {
            b.onclick = async () => {
                out = await getOutput(editor.get()[0], filteredDes, formatRadioBtns[0].checked ? "ttl" : "xml");
                addFinalContainer(out);
            };
        }
        break;
    case 4: // TODO Convert
        break;
    }
}
