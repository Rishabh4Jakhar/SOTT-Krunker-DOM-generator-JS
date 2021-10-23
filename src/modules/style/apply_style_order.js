import style_by_selector from "./style_by_selector.js";

export default function (obj, stylesheets) {
	// group styling based on highest priorities.
	let element_style = {};
	//* wildcard
	Object.assign(element_style, style_by_selector(stylesheets, "*"));

	//tag styling override
	Object.assign(element_style, style_by_selector(stylesheets, obj.tag));

	//class styling
	if (obj?.attr?.class) {
		let classList = typeof obj?.attr?.class === "string" ? [obj?.attr?.class] : [...obj?.attr?.class];
		classList.map(class_name => {
			Object.assign(element_style, style_by_selector(stylesheets, "." + class_name))
		});
	}

	//id styling
	if (obj?.attr?.id) {
		let idList = typeof obj?.attr?.id === "string" ? [obj?.attr?.id] : [...obj?.attr?.id];
		idList.map(id_name => {
			Object.assign(element_style, style_by_selector(stylesheets, "#" + id_name))
		});
	}

	//inline styling
	if (obj?.attr?.style) {
		let inline_style_object = {};
		for (let offset = 0; offset < obj?.attr?.style.length; offset+= 2) inline_style_object[obj?.attr?.style[offset].replace(/(;|:)/gm, "")] = obj?.attr?.style[offset + 1].replace(/(;|:)/gm, "").toString();
		Object.assign(element_style, inline_style_object);
	}

	return Object.entries(element_style).map(style => {return style[0] + ": " + style[1] + ";"}).join(" ");
}

