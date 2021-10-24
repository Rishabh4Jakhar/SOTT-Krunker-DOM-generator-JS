const hardcoded_ks = {
	onRender: `#Prevent BaseUI scaling.
	obj SCREENFRAME = GAME.UI.getSize();
	if ((num) SCREEN.width != (num) SCREENFRAME.width || (num) SCREEN.height != (num) SCREENFRAME.height){
		SCREEN = SCREENFRAME;
		GAME.UI.updateDIV("uiBase", "transform", "");
		GAME.UI.updateDIV("uiBase", "width", "");
		GAME.UI.updateDIV("uiBase", "height", "");
	}`,
	onDIVClicked: ``,
	onStart: `#Prevent BaseUI scaling. (init)
	GAME.UI.updateDIV("uiBase", "transform", "");
	GAME.UI.updateDIV("uiBase", "width", "");
	GAME.UI.updateDIV("uiBase", "height", "");

	#Load default mod.
	GAME.MODS.load("https://krunker-user-assets.nyc3.digitaloceanspaces.com/md47232/mod.zip");

	#Game optimisation.
	GAME.DEFAULT.disablePrediction();
	GAME.DEFAULT.disablePlayerBehaviour();
	GAME.DEFAULT.disable3D();
	GAME.INPUTS.disableDefault();
	GAME.PLAYERS.disableMeshes();

	#Remove default styling.
	GAME.UI.updateDIV("customGUIHolder", "display", "block");
	GAME.UI.updateDIV("gameUI", "textAlign", "left");
	GAME.UI.hideCrosshair();

	#Remove all unneeded audio.
	GAME.SETTINGS.set("ambientVolume", "0");
	GAME.SETTINGS.set("voiceVolume", "0");
	GAME.SETTINGS.set("uiVolume", "0");
	GAME.SETTINGS.set("skinVolume", "0");
	GAME.SETTINGS.set("playerVolume", "0");
	GAME.SETTINGS.set("dialogueVolume", "0");

	#Build SOTT_CANVAS. (Purely meant to be a white screen and the full parent element of the website.)
	GAME.UI.addDIV("SOTT_CANVAS", true, "position: absolute; height: 100%; width: 100%; overflow: auto; z-index: 2147483646; background-color: white;");
`,
	server: `#Generated by Swat's SOTT_HTMLTKSC

public action start(){
	#Disable server. SOTT KRDOM is fully clientside.
	GAME.DEFAULT.disablePlayerBehaviour();
	GAME.DEFAULT.disableServerSync();
}
`,
	client: function(onStart, onRender, onDIVClicked){return `#Generated by Swat's SOTT_HTMLTKSC

obj SCREEN = GAME.UI.getSize();
str[] DOM_NAMES = str[];

#toggle which body is shown, krdom navigation.
action SOTT_TOGGLE_BODY(str[] DOM_NAMES, str NAME){
	for (num i = 0; i < lengthOf DOM_NAMES; i++){
		GAME.UI.updateDIV(DOM_NAMES[i], "display", DOM_NAMES[i] == NAME ? "block" : "none");
	}
}

public action start(){
	${onStart}
	GAME.log("[SOTT KRDom] Website succesfully loaded!");
}

public action render(num delta){
	${onRender}
}

public action onDIVClicked(str id){
	${onDIVClicked}
}
`}
}

export default hardcoded_ks;