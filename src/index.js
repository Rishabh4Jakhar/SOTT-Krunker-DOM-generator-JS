#!/usr/bin/env node

import {cwd, argv} from "process";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import CSSJSON from "cssjson";
import clipboard from 'clipboardy';
import html2json from "html2json";

import default_source from "./constants/default_source.js";
import hardcoded_ks from "./constants/hardcoded_ks.js";

const __filename = fileURLToPath(import.meta.url);

const src = path.dirname(__filename) + "/";
const target_folder = cwd() + "/";

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
const default_styles = CSSJSON.toJSON(fs.readFileSync(src + "/constants/index.css"));
const imported_styles = [];

//list of all generated names.
const names = [];

//generate a fully unique name.
function name_generator(length = 8 /*should be about 1,198,774,720 combinations?*/) {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890", name = "bashSOTT_";
    while (true) {
        for (let i = 0; i < length; i++) name += alphabet[Math.floor(Math.random() * alphabet.length)];
        if (!names.includes(name)) break;
        name = "SOTT_";
    }
    names.push(name);
    return name;
}

//get all child elements that match the given type.
function all_el(el, type){
	return el.filter(main_element => main_element.node === "element" && main_element.tag === type);
}

//initialize head tags, and start building dom.
function build_dom(obj){
	//get the first head and body element.
	if (!obj.child.some(child => child?.node == "element" && child?.tag == "html")) throw("❌ [ERR] Missing <html> tags. HTML structure not valid.")
	let head = all_el(obj.child.find(child => child?.node == "element").child, "head");
	let body = all_el(obj.child.find(child => child?.node == "element").child, "body");

	if (head.length > 1 || body.length > 1) warning_stack.push("❌ [WARN] You can not have multiple head/body child elements within the <html> tags. Duplicate head/body elements will be ignored.");
	head = head[0];
	body = body[0] ?? function(){throw("❌ [ERR] Missing <body> tag. HTML structure not valid.")}();

	//get the site title and change it to map name.
	default_source.krunker_map.name = "No title";
	
	if (head?.child){
		let title = all_el(head.child, "title");
		if (title.length > 1) warning_stack.push("❌ [WARN] You can not have multiple <title> tags. Only the first one will be applied.");
		default_source.krunker_map.name = title[0]?.child[0].text ?? "No title";

		//add linked stylesheets.
		for (const link of all_el(head.child, "link")) {
			if (link?.attr?.rel == "stylesheet" && link?.attr?.href){
				imported_styles.push(CSSJSON.toJSON(fs.readFileSync(target_folder + link?.attr?.href)));
			}
		}
	}

	//recussive creation, bind top child to body.
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
		classList.map(class_name => {Object.assign(element_style, imported_styles[0]?.children?.["." + class_name]?.attributes ?? {})})
	}

	//id styling
	if (obj?.attr?.id) {
		let idList = typeof obj?.attr?.id === "string" ? [obj?.attr?.id] : [...obj?.attr?.id];
		idList.map(id_name => {Object.assign(element_style, imported_styles[0]?.children?.["#" + id_name]?.attributes ?? {})})
	}

	//inline styling
	if (obj?.attr?.style) {
		let inline_style_object = {};
		for (let offset = 0; offset < obj?.attr?.style.length; offset+= 2) inline_style_object[obj?.attr?.style[offset].replace(/(;|:)/gm, "")] = obj?.attr?.style[offset + 1].replace(/(;|:)/gm, "").toString()
		Object.assign(element_style, inline_style_object)
	}

	let element_style_inline = Object.entries(element_style).map(style => {return style[0] + ": " + style[1] + ";"}).join(" ")

	//if its a piece of text, create wrapper
	if (obj.node === "text"){
		let stripped_text = obj.text.replace(/(\r\n|\n|\r|\t)/gm, "");
		if (stripped_text.replace(/(\s+)/gm, "").length > 0){
			if (debug_html) console.log(`[HTML] Generated ${tag} "${element_name}" and appended it to ${parent}`);
			onStart += `    GAME.UI.addDIV("${element_name}", true, "${element_style_inline}", "${parent}");\n`;
			if (debug_html) console.log(`[HTML] Updated ${tag} "${element_name}" 's text to "${stripped_text}"`);
			onStart += `    GAME.UI.updateDIVText("${element_name}", "${stripped_text}");\n`;
		}
	}
	//if its an element, keep recussing till text is found.
	else if (obj.node === "element") {
		for (let child of obj.child){
			if (debug_html) console.log(`[HTML] Generated ${obj?.tag ?? "inline"} "${element_name}" and appended it to ${parent}`);
			onStart += `    GAME.UI.addDIV("${element_name}", true, "${element_style_inline}", "${parent}");\n`;
			generate_dom(child, element_name);
		}
	}
}

//go thru html files and start generating dom.
//TODO: Multiple html files.
for (const file of fs.readdirSync(target_folder)) {
    if (file == "index.html") {
		let contents = html2json.html2json(fs.readFileSync(target_folder + file, {encoding:'utf8', flag:'r'}).replace("<!DOCTYPE html>", ""));
		build_dom(contents);
    }
}

//create krunkscript for the clientside of the code
const client_side = hardcoded_ks.client(onStart, onRender);

//convert all code to base64
default_source.krunker_map.scripts.client = Buffer.from(client_side).toString("base64");
default_source.krunker_map.scripts.server = Buffer.from(server_side).toString("base64");

console.log();
if (warning_stack.length) console.log("===== Found issues: =====");
for (const error of warning_stack) console.warn("\u001b[31m" + error + "\u001b[0m");
if (warning_stack.length) console.log();

clipboard.writeSync(JSON.stringify(default_source.krunker_map));
if (debug_separator) console.log("===== Succesfully generated source =====");
console.log("\u001b[32m" + "✅ Map source copied to clipboard" + "\u001b[0m");
if (debug_separator) console.log();