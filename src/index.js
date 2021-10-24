#!/usr/bin/env node
console.info();

import {cwd, argv, exit} from "process";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import CSSJSON from "cssjson";
import clipboard from 'clipboardy';
import html2json from "html2json";

import default_source from "./constants/default_source.js";
import hardcoded_ks from "./constants/hardcoded_ks.js";
import error from "./modules/utils/error.js";
import generate_dom_obj from "./modules/utils/generate_dom.js";

let generate_dom = generate_dom_obj;

const src_folder = path.dirname(fileURLToPath(import.meta.url)) + "/";
const target_folder = cwd() + "/";
const target_folder_contents = fs.readdirSync(target_folder, {withFileTypes: true});
const index_file = path.join(target_folder, "/index.html");
const body_dictionary = new Map();

//TODO: Consider if this should become an array instead.
let onDIVClicked = hardcoded_ks.onDIVClicked;
let onStart = hardcoded_ks.onStart;
const dom_names = [];

//all default styles.
const default_styles = CSSJSON.toJSON(fs.readFileSync(src_folder + "/constants/index.css"));

//command parameters.
const debug_object = {
	debug_html: argv.includes("--html"), 
	debug_separator: argv.includes("--sep"),
	supressed: argv.includes("-s") || argv.includes("--supress"),
	isUI: argv.includes("--ui")
}

//go thru html files and start generating dom.
//TODO: Multiple html files.
if (!target_folder_contents.some(file => file.name == "index.html" && file.isFile())){
	error.error("index.html was not found. Every project needs a file called index.html, it serves as entry point. Make sure you're in your website's directory.");
}

//start setting things up for building to dom.
//get file contents.
let index_content = fs.readFileSync(path.join(target_folder, "index.html"), {encoding:'utf8', flag:'r'}).replace(/<!doctype html>/ig, "");

//convert to json
let html_json;
try {
	html_json = html2json.html2json(index_content);
	error.info(`File \x1b[35mindex.html\x1b[34m succesfully loaded as index, looking for sub-files..`)
} 
catch (e) {
	console.warn(e);
	error.error("Unable to parse the index HTML, check the error above.");
}

//start dom building.
build_dom(html_json, index_file);

//get all child elements that match the given type.
function all_el(el, type) {
	return el.filter(main_element => main_element.node === "element" && main_element.tag === type);
}

//initialize head tags, and start building dom.
function build_dom(obj, root_path) {
	//get the first head and body element.
	if (!obj.child.some(child => child?.node == "element" && child?.tag == "html")) {
		error.error("Missing <html> tags. HTML structure not valid.");
	}

	//get head and body
	let head = all_el(obj.child.find(child => child?.node == "element").child, "head");
	let body = all_el(obj.child.find(child => child?.node == "element").child, "body");

	//mulitple bodies/heads
	if (head.length > 1 || body.length > 1) {
		error.warning("You can not have multiple head/body child elements within the <html> tags. Duplicate head/body elements will be ignored.");
	}

	//applying first head and body.
	head = head[0] ?? error.info("No head tag found.")
	body = body[0] ?? error.error("Missing <body> tag. HTML structure not valid.");

	//get the site title and change it to map name.
	if (root_path == index_file) {
		default_source.krunker_map.name = "No title";
	}

	const imported_styles = [];

	//head handling.
	if (head?.child){
		let title = all_el(head.child, "title");

		if (root_path == index_file){
			if (title.length > 1) {
				error.warning("You can not have multiple <title> tags. Only the first one will be applied.");
			} 
			else if (title.length < 1){
				error.info("No title tag found, applying default title.");
			}

			if (title.length >= 1){
				default_source.krunker_map.name = title[0]?.child[0].text;
			}
		}
		else if (title.length > 0){
			error.warning("<Title> tags in child documents will not work. They will be ignored.")
		}

		//add linked stylesheets.
		for (const link of all_el(head.child, "link")) {
			if (link?.attr?.rel == "stylesheet" && link?.attr?.href){
				imported_styles.push(CSSJSON.toJSON(fs.readFileSync(path.join(path.dirname(root_path), link?.attr?.href))));
				error.info(`Stylesheet \x1b[35m${path.basename(link?.attr?.href)}\x1b[34m succesfully added to \x1b[35m${path.basename(root_path)}\x1b[34m`)
			}
		}
	}

	//render body and apply.
	let dom = generate_dom.generate_dom(body, "SOTT_CANVAS", [default_styles, ...imported_styles], debug_object, root_path);
	onStart += `\n	### PAGE ${dom.body_name} ### \n`
	onStart += dom.content;
	body_dictionary.set(dom.path, dom.body_name);
	//TODO:
	dom_names.push(dom)

	for (const external_path of dom.external_paths) {
		if (body_dictionary.get(external_path.path)) continue;
		if (fs.existsSync(external_path.path)){
			let index_content = fs.readFileSync(external_path.path, {encoding:'utf8', flag:'r'}).replace(/<!doctype html>/ig, "");
			let html_json;
			try {
				html_json = html2json.html2json(index_content);
				error.info(`File \x1b[35m${path.basename(external_path.path)}\x1b[34m succesfully added as routable sub-file.`);
				build_dom(html_json, external_path.path);
			} 
			catch (e) {
				console.warn(e);
				error.error(`File ${external_path.path} was unable to be parsed.`);
			}
		} else {
			error.warning(`Document path \x1b[35m"${external_path.path}"\x1b[33m referenced in file \x1b[35m"${root_path}"\x1b[33m does not exist, and it will thus be ignored.\x1b[0m`);
			continue;
		}
	}
}

for (const dom_name of dom_names) body_dictionary.set(dom_name.path, dom_name.body_name);

for (const dom_name of dom_names) {
	for (const external_path of dom_name.external_paths) {
		let location = external_path.path;
		for (const caller of external_path.callers) {
			onDIVClicked += `\n	if(id == "${caller}"){
		SOTT_TOGGLE_BODY(DOM_NAMES, "${body_dictionary.get(location)}");
	}`
		}
	}
}

onStart += `\n	#load and show index dom by default.
	DOM_NAMES = str${JSON.stringify(dom_names.map(dom_name => dom_name.body_name))};
	SOTT_TOGGLE_BODY(DOM_NAMES, "${dom_names[0].body_name}");
`

//create krunkscript for the clientside of the code
const client_side = hardcoded_ks.client(onStart, hardcoded_ks.onRender, onDIVClicked);

//convert all code to base64
default_source.krunker_map.scripts.client = Buffer.from(client_side).toString("base64");
default_source.krunker_map.scripts.server = Buffer.from(hardcoded_ks.server).toString("base64");

//extra logging and copying to clipboard.
console.info();

clipboard.writeSync(JSON.stringify(default_source.krunker_map));

if (debug_object.debug_separator) console.info("===== Succesfully generated source =====");
console.info("\x1b[32m" + " ✅ Map source copied to clipboard" + "\x1b[0m");
console.info();