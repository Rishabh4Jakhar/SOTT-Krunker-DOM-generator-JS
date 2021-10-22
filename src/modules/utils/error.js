export default {
	error: (error) => {
		console.warn(`\x1b[31m ❌ [ERR] ${error} \x1b[0m`);
		process.exit();
	},

	warning: (error) => {
		console.warn(`\x1b[33m ⚡ [WARN] ${error} \x1b[0m`);
	},

	info: (error) => {
		console.warn(`\x1b[34m ❔ [INFO] ${error} \x1b[0m`);
	}
}