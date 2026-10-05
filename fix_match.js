function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function matches(k, legal) {
    const nk = normalize(k);
    const nl = normalize(legal);
    if (nk === nl) return true;
    if (nk.includes(nl) || nl.includes(nk)) return true;
    
    const wordsK = nk.split(/\s+/);
    const wordsL = nl.split(/\s+/);
    // if all words in K are in L
    const allKinL = wordsK.every(w => wordsL.includes(w));
    if (allKinL) return true;
    
    return false;
}

console.log(matches("Erika Gavilánez", "Erika Gissell Gavilánez Gallardo"));
