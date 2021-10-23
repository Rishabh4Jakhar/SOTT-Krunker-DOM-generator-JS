export default function style_by_tag(stylesheets, tag){
	let style_object = {};

	//for every imported stylesheet.
	stylesheets.map(stylesheet => {
		Object.entries(stylesheet?.children)
		//for every css class name.
		.filter(names => names[0]
			//split by "," regardless of spacing.
			.match(/[^,(?! )]+/g)
			//find match, regardless of casing.
			.find(names => names.toLowerCase() == tag.toLowerCase()))
		//assign newly found attributes.
		.map(attribs => Object.assign(style_object, attribs[1].attributes));
	});

	return style_object;
}