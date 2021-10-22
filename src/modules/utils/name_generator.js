//generate a fully unique name.
export default function name_generator(names, length = 8 /*should be about 1,198,774,720 combinations?*/) {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890", name = "SOTT_";
    while (true) {
        for (let i = 0; i < length; i++) name += alphabet[Math.floor(Math.random() * alphabet.length)];
        if (!names.includes(name)) break;
        name = "SOTT_";
    }
    names.push(name);
    return name;
}