export default {
	addDiv: (name, inline_style, parent_name, debug_object) => {
		if (debug_object.debug_html) {
			console.info(`[HTML] Generated ${obj.tag} "${name}" and appended it to ${parent_name}`);
		}
		return `    GAME.UI.addDIV("${name}", true, "${inline_style}", "${parent_name}");\n`;
	},
	updateDIVText: (tag, element_name, text, debug_object) => {
		if (debug_object.debug_html) {
			console.info(`[HTML] Updated ${tag} "${element_name}" 's text to "${text}"`);
		}
		return `    GAME.UI.updateDIVText("${element_name}", " ${text}");\n`;
	}
};