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

//array of all warnings, gets displayed at end of building.
const warning_stack = [];

//wether to show css or html build debugging.
const debug_css = false;
const debug_html = false;
const debug_separator = false;

//all external styles.
const default_styles = CSSJSON.toJSON(fs.readFileSync("./constants/index.css"));
const imported_styles = [];

//list of all generated names.
const names = [];

function name_generator(length = 8 /*should be about 1,198,774,720 combinations?*/) {
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
			imported_styles.push(CSSJSON.toJSON(fs.readFileSync(website_folder + link?.attr?.href)));
		}
	}

	for (let child of body.child){
		generate_dom(child, "SOTT_BODY");
	}
}

function generate_dom(obj, parent) {
	//create element name.
	let tag = obj?.tag ? obj.tag : "inline";
	let element_name = tag + "_" + name_generator();
	if ((debug_html || debug_css) && debug_separator) console.log(`[HTML/CSS] ----- ${element_name} -----`);

	// group of styling based on highest priorities.
	let element_style = {};
	//default tag styling
	Object.assign(element_style, default_styles.children?.[tag]?.attributes ?? {});

	//class styling
	if (obj?.attr?.class) {
		let classList = typeof obj?.attr?.class === "string" ? [obj?.attr?.class] : [...obj?.attr?.class];
		classList.map(class_name => {Object.assign(element_style, imported_styles.children?.["." + class_name]?.attributes ?? {})}) //class styling
	}

	if (obj?.attr?.id) {
		let idList = typeof obj?.attr?.id === "string" ? [obj?.attr?.id] : [...obj?.attr?.id];
		idList.map(id_name => {Object.assign(element_style, imported_styles.children?.["." + id_name]?.attributes ?? {})}) //id styling
	}

	//TODO:
	//Object.assign(element_style, ?? {}); //inline styling

	//if its a piece of text, create wrapper
	if (obj.node === "text"){
		let stripped_text = obj.text.replace(/(\r\n|\n|\r|\t)/gm, "");
		if (stripped_text.replace(/(\s+)/gm, "").length > 0){
			if (debug_html) console.log(`[HTML] Generated ${tag} "${element_name}" and appended it to ${parent}`);
			onStart += `    GAME.UI.addDIV("${element_name}", true, "", "${parent}");\n`;
			if (debug_html) console.log(`[HTML] Updated ${tag} "${element_name}" 's text to "${stripped_text}"`);
			onStart += `    GAME.UI.updateDIVText("${element_name}", "${stripped_text}");\n`;
		}
	}
	//if its an element, keep recussing till text is found.
	else if (obj.node === "element") {
		for (let child of obj.child){
			if (debug_html) console.log(`[HTML] Generated ${obj?.tag ?? "inline"} "${element_name}" and appended it to ${parent}`);
			onStart += `    GAME.UI.addDIV("${element_name}", true, "", "${parent}");\n`;
			generate_dom(child, element_name);
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