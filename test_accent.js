const legal = "Erika Gissell Gavilánez Gallardo";
const keys = ["Erika Gavilanez", "erika gavilanez", "Erika Gavilánez"];

for (let k of keys) {
    const match = k.toLowerCase().includes(legal.toLowerCase()) || legal.toLowerCase().includes(k.toLowerCase());
    console.log(k, match);
}
