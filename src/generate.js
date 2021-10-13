console.clear();

import fs from "fs";
import XMLJSON from "xml2json";
import CSSJSON from "CSSJSON";
import nodecopy from "copy-paste";
import html2json from "html2json";

import default_source from "./constants/default_source.js";
import hardcoded_ks from "./constants/hardcoded_ks.js";

const website_folder = "../website/";
const reserved_names = ["id", "class", "$t"];
const virtual_elements = [];

let onRender = hardcoded_ks.onRender;
let onStart = hardcoded_ks.onStart;
const server_side = hardcoded_ks.server;

const debug_css = true;
const names = [];
const warning_stack = [];
const default_styles = CSSJSON.toJSON(fs.readFileSync("./constants/index.css"));

const styles = [default_styles];

function name_generator(length = 8) {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890", name = "SOTT_";
    while (true) {
        for (let i = 0; i < length; i++) name += alphabet[Math.floor(Math.random() * alphabet.length)];
        if (!names.includes(name)) break;
        name = "SOTT_";
    }
    names.push(name);
    return name;
}

function all_el(el, type){
	return el.filter(main_element => main_element.node === "element" && main_element.tag === type);
}

function build_dom(obj){
	//get the first head and body element.
	let head = all_el(obj.child[0].child, "head");
	let body = all_el(obj.child[0].child, "body");

	if (head.length > 1 || body.length > 1) warning_stack.push("❌ [WARN] You can not have multiple head/body child elements within the <html> tags. Duplicate head/body elements will be ignored.");
	head = head[0];
	body = body[0];

	//get the site title and change it to map name.
	let title = all_el(head.child, "title");
	if (title.length > 1) warning_stack.push("❌ [WARN] You can not have multiple <title> tags. Only the first one will be applied.");
	default_source.krunker_map.name = title[0]?.child[0].text ?? "No title";

	//add linked stylesheets.
	for (const link of all_el(head.child, "link")) {
		if (link?.attr?.rel == "stylesheet" && link?.attr?.href){
			styles.push(CSSJSON.toJSON(fs.readFileSync(website_folder + link?.attr?.href)));
		}
	}

	//recussive_creation(body, "SOTT_BODY");
}

function apply_styling(obj, el_name){
	//TODO: inline styling
	let style_tags = [
		el_name.split("_")[0], 
		...obj.class?.split(" ").map(x => {return "." + x}) ?? [], 
		...obj.id?.split(" ").map(x => {return "#" + x}) ?? []
	];

	//for all styling tags availble 
	for (const style_tag of style_tags) {
		//loop thru all styles to find style tag
		for (let i = 0; i < styles.length; i++) {
			for (const style_class of Object.entries(styles[i].children)) {
				//if if id or class matches.
				if (style_tag == style_class[0]){
					if (debug_css) console.log("\n" + style_class[0] + " => " + el_name);
					let class_index = virtual_elements.findIndex(x => x.id == el_name); //get index of style class of specific parent.

					if (class_index >= 0){
						for (const name of Object.entries(style_class[1].attributes)) { //go over all atributes and overwrite or add them.
							let attribute_index = virtual_elements[class_index].attributes.findIndex(x => x[0] == name[0]);

							//if attribute exists already, overwrite.
							if (attribute_index >= 0){
								if (debug_css) console.log("⊢ Overwriting property " + virtual_elements[class_index].attributes[attribute_index][0] + " to " + name[1]);
								virtual_elements[class_index].attributes[attribute_index][1] = name[1];
							} 
							//if attribute doesnt exist, create new one.
							else {
								if (debug_css) console.log("⊢ Adding new property to existing class: " + name[0] + " with value " + name[1]);
								virtual_elements[class_index].attributes.push([name[0], name[1]]);
							}
						}
					}
					else {
						//creating new attribute class.
						if (debug_css) console.log("⊢ Creating new class");
						virtual_elements.push({id: el_name, attributes: Object.entries(style_class[1].attributes)});
					}
				}
			}
		}
	}
	return virtual_elements.find(x => x.id == el_name).attributes.map(y => {return y[0] + ": " + y[1] + ";"}).join(" ");
}

function recussive_creation(obj, parent) {
	//console.log(obj);
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
				create_text_el(el_type, parent, children);
			}
			else if (typeof children == "object"){
				let name = el_type + "_" + name_generator();
				onStart += `    GAME.UI.addDIV("${name}", true, "${apply_styling(children, name) ?? ""}", "${parent}");\n`;
				recussive_creation(children, name);
			}
		}
	}

	function create_text_el(el_type, parent, text){
		let name = el_type + "_" + name_generator();
		onStart += `    GAME.UI.addDIV("${name}", true, "${apply_tag(el_type) ?? ""}", "${parent}");\n`;
		console.log(name);
		if (text.length > 0) onStart += `    GAME.UI.updateDIVText("${name}", "${text}");\n`;
	}

}

function apply_tag(tag){
	for (const stylesheet of styles) {
		for (const style_pair of Object.entries(stylesheet.children)) {
			if (style_pair[0] == tag){
				return Object.entries(style_pair[1].attributes).map(x => {return `${x[0]}: ${x[1]}`;}).join("");
			}
		}
	}
}

for (const file of fs.readdirSync(website_folder)) {
    if (file == "index.html") {
		let contents = html2json.html2json(fs.readFileSync(website_folder + file, {encoding:'utf8', flag:'r'}));
		build_dom(contents);
    }
}

const client_side = hardcoded_ks.client(onStart, onRender);

default_source.krunker_map.scripts.client = Buffer.from(client_side).toString("base64");
default_source.krunker_map.scripts.server = Buffer.from(server_side).toString("base64");

console.log();
nodecopy.copy(JSON.stringify(default_source.krunker_map));

if (warning_stack.length) console.log("===== Found issues: =====");
for (const error of warning_stack) console.warn("\u001b[31m" + error + "\u001b[0m");
if (warning_stack.length) console.log();

console.log("===== Succesfully generated source =====");
console.log("\u001b[32m" + "✅ Map source copied to clipboard" + "\u001b[0m");
console.log();