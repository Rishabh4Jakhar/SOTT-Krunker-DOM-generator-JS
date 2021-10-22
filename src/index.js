#!/usr/bin/env node

import {cwd, argv, exit} from "process";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import CSSJSON from "cssjson";
import clipboard from 'clipboardy';
import html2json from "html2json";

import default_source from "./constants/default_source.js";
import hardcoded_ks from "./constants/hardcoded_ks.js";

import apply_style_order from "./modules/style/apply_style_order.js";
import name_generator from "./modules/utils/name_generator.js";
import escape_string from "./modules/utils/escape_string.js";
import default_krunkscript_functions from "./constants/default_krunkscript_functions.js";
import error from "./modules/utils/error.js";

const src_folder = path.dirname(fileURLToPath(import.meta.url)) + "/";
const target_folder = cwd() + "/";
const target_folder_contents = fs.readdirSync(target_folder, {withFileTypes: true});

//TODO: Consider if this should become an array instead.
let onStart = hardcoded_ks.onStart;

//wether to show css or html build debugging.
const debug_object = {
	debug_html: argv.includes("--html"), 
	debug_separator: argv.includes("--sep"),
	supressed: argv.includes("-s") || argv.includes("--supress")
}

//all external styles.
const default_styles = CSSJSON.toJSON(fs.readFileSync(src_folder + "/constants/index.css"));
const imported_styles = [];

//list of all generated names.
const names = [];

//go thru html files and start generating dom.
//TODO: Multiple html files.
if (!target_folder_contents.some(file => file.name == "index.html" && file.isFile())){
	error.error("index.html was not found. Every project needs a file called index.html, it serves as entry point. Make sure you're in your website's directory.");
}

//start setting things up for building to dom.
//get file contents.
let index_content = fs.readFileSync(target_folder + "index.html", {encoding:'utf8', flag:'r'}).replace(/<!doctype html>/ig, "");

//convert to json
let html_index;
try {html_index = html2json.html2json(index_content);} 
catch (e) {
	console.warn(e);
	error.error("Unable to parse the HTML, check the error above.");
}

//start dom building.
build_dom(html_index);

//get all child elements that match the given type.
function all_el(el, type) {
	return el.filter(main_element => main_element.node === "element" && main_element.tag === type);
}

//initialize head tags, and start building dom.
function build_dom(obj) {
	//get the first head and body element.
	if (!obj.child.some(child => child?.node == "element" && child?.tag == "html")) {
		error.error("Missing <html> tags. HTML structure not valid.");
	}

	let head = all_el(obj.child.find(child => child?.node == "element").child, "head");
	let body = all_el(obj.child.find(child => child?.node == "element").child, "body");

	if (head.length > 1 || body.length > 1) {
		error.warning("You can not have multiple head/body child elements within the <html> tags. Duplicate head/body elements will be ignored.");
	}

	head = head[0] ?? error.info("No head tag found.")
	body = body[0] ?? error.error("Missing <body> tag. HTML structure not valid.");

	//get the site title and change it to map name.
	default_source.krunker_map.name = "No title";
	
	if (head?.child){
		let title = all_el(head.child, "title");

		if (title.length > 1) {
			error.warning("You can not have multiple <title> tags. Only the first one will be applied.");
		} 
		else if (title.length < 1){
			error.info("No title tag found, applying default title.");
		}

		if (title.length >= 1){
			default_source.krunker_map.name = title[0]?.child[0].text;
		}

		//add linked stylesheets.
		for (const link of all_el(head.child, "link")) {
			if (link?.attr?.rel == "stylesheet" && link?.attr?.href){
				imported_styles.push(CSSJSON.toJSON(fs.readFileSync(target_folder + link?.attr?.href)));
			}
		}
	}
	generate_dom(body, "SOTT_CANVAS");
}

function generate_dom(obj, parent) {
	obj.tag ??= "inline";
	let name = name_generator(names);
	let element_name = obj.tag + "_" + name;
	let element_style_inline = apply_style_order(obj, [default_styles, ...imported_styles]);
	names.push(name);

	if (debug_object.debug_html && debug_object.debug_separator){
		console.info(`[HTML/CSS] ----- ${element_name} -----`);
	}

	if (obj.tag === "a") console.log(obj);

	//if its a piece of text, create wrapper
	if (obj.node === "text"){
		let stripped_text = obj.text.replace(/(\r\n|\n|\r|\t)/gm, "");
		if (stripped_text.replace(/(\s+)/gm, "").length > 0){
			onStart += default_krunkscript_functions.addDiv(element_name, element_style_inline, parent, debug_object);
			onStart += default_krunkscript_functions.updateDIVText(obj.tag, element_name, escape_string(stripped_text.replace(/(\s+)/gm, " ")), debug_object);
		}
	}
	//if its an element, keep recussing till text is found.
	else if (obj.node === "element") {
		onStart += default_krunkscript_functions.addDiv(element_name, element_style_inline, parent, debug_object);
		
		for (const child of obj.child){
			generate_dom(child, element_name);
		}
	}
}

//create krunkscript for the clientside of the code
const client_side = hardcoded_ks.client(onStart, hardcoded_ks.onRender);

//convert all code to base64
default_source.krunker_map.scripts.client = Buffer.from(client_side).toString("base64");
default_source.krunker_map.scripts.server = Buffer.from(hardcoded_ks.server).toString("base64");

//extra logging and copying to clipboard.
console.log();

clipboard.writeSync(JSON.stringify(default_source.krunker_map));

if (debug_object.debug_separator) console.log("===== Succesfully generated source =====");
console.log("\x1b[32m" + "✅ Map source copied to clipboard" + "\x1b[0m");
if (debug_object.debug_separator) console.log();