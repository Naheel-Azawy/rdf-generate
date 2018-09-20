const THE_DRAMATIC_INTRO = `
<div style='position: fixed; top: 30%; padding: 10px'>
    <h2>Insert a single generic object of your JSON</h2>
    <br>
    <div id="arrowAnim">
      <div class="arrowSliding">
        <div class="arrow"></div>
      </div>
      <div class="arrowSliding delay1">
        <div class="arrow"></div>
      </div>
      <div class="arrowSliding delay2">
        <div class="arrow"></div>
      </div>
      <div class="arrowSliding delay3">
        <div class="arrow"></div>
      </div>
    </div>
    <br><br>
    <h2>and press NEXT</h2>
</div>
`;

const ADD_ENTITY_TEMPLATE = `
<header class="dialogHeader">
    <h1>{{dialogTitle}}</h1>
</header>
<form>
    <div class="form-group">
        <label for="json_path">Json path</label>
        <input type="text" class="form-control bkgStyle" id="json_path" name="json_path"
               value="{{entities.json_path}}" required>
    </div>
    <div class="form-group">
        <label for="json_path">Entity name (optional)</label>
        <input type="text" class="form-control bkgStyle" id="entity_name" name="entity_name"
               value="{{entities.name}}">
    </div>
    <div class="form-group">
        <label for="iri_template">IRI Template</label>
        <input type="text" class="form-control bkgStyle" id="iri_template" name="iri_template"
               value="{{entities.iri_template}}" required>
    </div>
    <div class="form-group">
        <label for="type">Type</label>
        <input type="text" class="form-control bkgStyle" id="type" name="type"
               value="{{entities.type}}" required>
    </div>
    <div class="form-group">
        <label for="include">Include</label>
        <input type="text" class="form-control bkgStyle" id="include" name="include"
               value="{{entities.include}}" required>
    </div>
    <input type="button" class="btn btn-primary" formnovalidate onclick="setEntityInput()" value="Add Entity">

    <input type="button" class="btn btn-primary" formnovalidate onclick="closeEntityDialog()" value="Cancel">
</form>
`;

const ENTITIES_HEADER_TEMPLATE = `
<tr>
    <div class="contentText paddingRL title">Entities:</div>
    <br>
</tr>
<div id="tableHolder"></div>
<a id="addEntity" class="btn btn-info" onclick="addEntity()">
    Add Entity
</a>
`;

const ENTITIES_TABLE_TEMPLATE = `
<div class="contentText">
    {{#each this}}
    <div class="w3-container">
        <ul class="w3-ul w3-card-4 list-entities">
            <li class="w3-display-container"><div class="paddingRL title">Path: {{@key}}</div></li>
            <div class="paddingRL">Entity name (optional):</div>
            <li class="w3-display-container"><input class="contentText trStyle form-control" type="text" value="" onchange="onEntityChange(this, '{{@key}}', 'name')"></li>

            <div class="paddingRL">IRI template:</div>
            <li class="w3-display-container"><input class="contentText trStyle form-control" type="text" value="{{iri_template}}" onchange="onEntityChange(this, '{{@key}}', 'iri_template')"></li>

            <div class="paddingRL">Type:</div>
            <li class="w3-display-container"><input class="contentText trStyle form-control" type="text" value="{{type}}" onchange="onEntityChange(this, '{{@key}}', 'type')""></li>

            <div class="paddingRL">Include:</div>
            <li class="w3-display-container"><input class="contentText trStyle form-control" type="text" value="{{include}}" onchange="onEntityChange(this, '{{@key}}', 'include')""></li>
        </ul><br>
    </div>
    {{/each}}
</div>
`;

const PROPERTIES_HEADER_TEMPLATE = `
<tr>
    <div class="contentText paddingRL title">Properties:</div>
    <br>
</tr>
<div id="tableHolder"></div>
`;

const PROPERTIES_TABLE_TEMPLATE = `
<div class="contentText">
    {{#each this}}
    <div class="w3-container">
        <ul class="w3-ul w3-card-4 list-entities paddingRL">
            <div class="title"><b>{{name}}</b></div>
            <div class="title">{{@key}}</div>

            {{#each properties}}
            <li>
            <b>Path: {{@key}}</b>

            <table style="width: 100%">
            <tr>
                <th style="width: 50%">RDF Predicates</th>
                <th>&nbsp;&nbsp;&nbsp;</th>
                {{#if data_types}}
                <th style="width: 50%">Datatype</th>
                {{else}}
                <th style="width: 50%">&nbsp;&nbsp;&nbsp;</th>
                {{/if}}
            </tr>
            <tr>
                <td>
                <select class="form-control bkgStyle " style="margin-bottom: 10px; margin-right: 10px" onchange="onPredChange(this, '{{@key}}')">
                {{#each suggested_predicates}}
                    <option value="{{@index}}">{{prefix_name}}:{{predicate}}</option>
                {{/each}}
                <!--COMMENTED FOR NOW-->
                    <!--<option value="{{suggested_predicates.length}}">ADD A PREDICATE</option>-->
                </select>
                </td>
                <td></td>
                <td>
                {{#if data_types}}
                <select class="form-control bkgStyle" style="margin-bottom: 10px" onchange="onDataTypeChange(this, '{{@key}}')">
                {{#each data_types}}<option value="{{@index}}">{{this}}</option>{{/each}}
                </select>
                {{/if}}
                </td>
            </tr>
            </table>
            </li>
            {{/each}}

        </ul>
        <br>
    </div>
    {{/each}}
</div>
`;

const FINAL_HEADER_TEMPLATE = `
<div id="tableHolder"></div>
`;

const FINAL_TEMPLATE = `
 <div class="w3-container" style="height:80%; width: 100%; position:absolute">
    <div class="contentText paddingRL title">Descriptor:</div>
    <br>
            <div id="desEditor" class="w3-card-4" style="height:50%"></div>
            <br>
    <div class="contentText paddingRL title">Output:</div>
    <br>
        <div id="outEditor" class="w3-card-4" style="height:50%;"></div>
        </div>

`;

const FINAL_STUFF = `
<table>
    <td><b>Output format:</b>&nbsp&nbsp<br>&nbsp</td>
    <td>
    <label class="radio-inline"><input type="radio" name="formatRadio" checked>TURTLE</label>
    <br>
    <label class="radio-inline"><input type="radio" name="formatRadio">RDF/XML</label>
    </td>
    <td>&nbsp&nbsp&nbsp&nbsp&nbsp</td>
    <!-- TODO: uncomment this and implement file uploading
    <td><form action="fileupload" method="post" enctype="multipart/form-data"><input type="file" name="filetoupload"><input type="submit"></form></td>
    -->
</table>
`;


