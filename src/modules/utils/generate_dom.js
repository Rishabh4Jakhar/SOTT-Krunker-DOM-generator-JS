import fs from "fs";
import path from "path"

import apply_style_order from "../style/apply_style_order.js";
import name_generator from "../utils/name_generator.js";
import escape_string from "../utils/escape_string.js";
import default_krunkscript_functions from "../../constants/default_krunkscript_functions.js";

export default {
	names: [],
	data: {},
	generate_dom(obj, parent, stylesheets, debug_object, path){
		this.data = {
			path: path,
			external_paths: [],
			body_name: undefined,
			content: ""
		}
		this._generate_dom(obj, parent, stylesheets, debug_object);
		return this.data;
	},
	_generate_dom(obj, parent, stylesheets, debug_object) {
		obj.tag ??= "inline";
		
		let name = name_generator(this.names);
		let element_name = obj.tag + "_" + name;
		let element_style_inline = apply_style_order(obj, stylesheets);
		this.data.body_name ??= element_name;
		this.names.push(name);

		if (obj.tag.toLowerCase() == "a") {
			this.data.external_paths.push(path.join(path.dirname(this.data.path), obj.attr.href));
		}

		if (debug_object.debug_html && debug_object.debug_separator){
			console.info(`[HTML/CSS] ----- ${element_name} -----`);
		}

		//if its a piece of text, create wrapper
		if (obj.node === "text"){
			let stripped_text = obj.text.replace(/(\r\n|\n|\r|\t)/gm, "");
			if (stripped_text.replace(/(\s+)/gm, "").length > 0){
				this.data.content += default_krunkscript_functions.addDiv(element_name, element_style_inline, parent, debug_object);
				this.data.content += default_krunkscript_functions.updateDIVText(obj.tag, element_name, escape_string(stripped_text.replace(/(\s+)/gm, " ")), debug_object);
			}
		}
		//if its an element, keep recussing till text is found.
		else if (obj.node === "element") {
			this.data.content += default_krunkscript_functions.addDiv(element_name, element_style_inline, parent, debug_object);
			
			for (const child of obj.child){
				this._generate_dom(child, element_name, stylesheets, debug_object);
			}
		}
	}
}