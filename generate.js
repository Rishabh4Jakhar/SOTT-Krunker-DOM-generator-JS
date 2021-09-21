console.clear();
let defaults = require("./defaults.json");
const fs = require('fs');
const XMLJSON = require('xml2json');
const CSSJSON = require('cssjson');

let website_folder = "./website/";

let onStart = `GAME.DEFAULT.disablePrediction();
	GAME.UI.updateDIV("customGUIHolder", "display", "block");
	GAME.UI.updateDIV("gameUI", "textAlign", "left");
    GAME.DEFAULT.disablePlayerBehaviour();
    GAME.DEFAULT.disable3D();
    GAME.INPUTS.disableDefault();
    GAME.UI.hideCrosshair();
    GAME.PLAYERS.disableMeshes();
	GAME.SETTINGS.set("sound", "0");
    
    GAME.UI.addDIV("SOTT_BODY", true, "position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 9999999999; background-color: white;");
`;

let serverSide = `#Generated by Swat's SOTT_HTMLTKSC

public action start(){
	GAME.DEFAULT.disablePlayerBehaviour();
	GAME.DEFAULT.disableServerSync();
}`;

defaults.krunker_map.scripts.server = Buffer.from(serverSide).toString("base64");

let id_length = 6;
let names = [];
let styles = [CSSJSON.toJSON(fs.readFileSync("./index.css"))];
function name_generator(length) {
    let x = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890", name = "SOTT_";
    while (true) {
        for (let i = 0; i < length; i++) {
            name += x[Math.floor(Math.random() * x.length)];
        }
        if (!names.includes(name)) break;
        name = "SOTT_";
    }
    names.push(name);
    return name;
}

function build_dom(obj){
	const html = obj.html[0];
	const head = html?.head[0];
	const body = html?.body[0];
	for (const link of head.link) {
		if (link?.rel == "stylesheet"){
			styles.push(CSSJSON.toJSON(fs.readFileSync(website_folder + link.href)));
		}
	}
	//console.log(JSON.stringify(styles));

	//get head data.
	defaults.krunker_map.name = head?.title[0] ?? "No title";

	recussive_creation(body, "SOTT_BODY");
}

let reserved_names = ["id", "class", "$t"];
let virtual_elements = [];


function apply_styling(obj, el_name){
	//TODO: inline styling
	let style_tags = [
		el_name.split("_")[0], 
		...obj.class?.split(" ").map(x => {return "." + x}) ?? [], 
		...obj.id?.split(" ").map(x => {return "#" + x}) ?? []
	];
	style_tags.unshift();
	
	for (let i = 0; i < styles.length; i++) { //loop thru style properties.
		for (const style of Object.entries(styles[i].children)) { //loop thru element class name.

			//if if id or class matches.
			if (style_tags.includes(style[0])){
				console.log("\n" + style[0] + " => " + el_name);
				let class_index = virtual_elements.findIndex(x => x.id == el_name); //get index of style class of specific parent.

				//if class already exists...
				if (class_index >= 0){
					for (const name of Object.entries(style[1].attributes)) { //go over all atributes and overwrite or add them.
						let attribute_index = virtual_elements[class_index].attributes.findIndex(x => x[0] == name[0]);

						//if attribute exists already, overwrite.
						if (attribute_index >= 0){
							console.log("⊢ Overwriting property " + virtual_elements[class_index].attributes[attribute_index][0] + " to " + name[1]);
							virtual_elements[class_index].attributes[attribute_index][1] = name[1];
						} 
						//if attribute doesnt exist, create new one.
						else {
							console.log("⊢ Adding new property to existing class: " + name[0] + " with value " + name[1]);
							virtual_elements[class_index].attributes.push([name[0], name[1]]);
						}
					}
				}
				else {
					//creating new attribute class.
					console.log("⊢ Creating new class");
					virtual_elements.push({id: el_name, attributes: Object.entries(style[1].attributes)});
				}
			}
		}
	}

	return virtual_elements.find(x => x.id == el_name).attributes.map(y => {return y[0] + ": " + y[1] + ";"}).join(" ");
}

function recussive_creation(obj, parent) {
	for (const el_type of Object.keys(obj)){
		if (el_type == "$t"){
			if (!Object.keys(obj).some(x => !reserved_names.includes(x))) {
				if (obj[el_type].length > 0) onStart += `    GAME.UI.updateDIVText("${parent}", "${obj[el_type]}");\n`;
				return;
			} else if (obj[el_type].length > 0){
				throw("Please do not use text in nested elements. Make a special element for each bit of text.");
			}
		} else if (reserved_names.includes(el_type)){
			continue;
		}

		for (const children of obj[el_type]) {
			if (typeof children == "string"){
				create_text_el(el_type, parent, obj[el_type]);
			}
			else if (typeof children == "object"){
				let name = el_type + "_" + name_generator(id_length);
				let style_string = apply_styling(children, name);
				onStart += `    GAME.UI.addDIV("${name}", true, "${style_string ?? ""}", "${parent}");\n`;
				recussive_creation(children, name);
			}
		}
	}

	function create_text_el(el_type, parent, text){
		let name = el_type + "_" + name_generator(id_length);
		onStart += `    GAME.UI.addDIV("${name}", true, "", "${parent}");\n`;
		if (text.length > 0) onStart += `    GAME.UI.updateDIVText("${name}", "${text}");\n`;
	}
}

for (const file of fs.readdirSync(website_folder)) {
    if (file == "index.html") {
        let contents = XMLJSON.toJson(fs.readFileSync(website_folder + file), {
			object: true,
			arrayNotation: true,
			sanitize: true
		});
		build_dom(contents);
    }
}

let script = `#Generated by Swat's SOTT_HTMLTKSC

public action start(){
    ${onStart}
}`;

console.log("\n" + JSON.stringify(virtual_elements));
defaults.krunker_map.scripts.client = Buffer.from(script).toString("base64");
console.log("\n");
console.log("===== Map source =====");
console.log("\n");
console.log(JSON.stringify(defaults.krunker_map));