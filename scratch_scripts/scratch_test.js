const user = { name: "Haydin Fernando Mendoza Clavijo", email: "fernandomendozaclavijo22@gmail.com" };
const evTrainer = "FER ARAGON";

const isTrainerMatchingUser = (evTrainer, user) => {
  if (!evTrainer || !user) return false;
  const normalize = (str) => (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

  const trainerStr = normalize(evTrainer);
  const userName = normalize(user.name || user.displayName || '');
  const userEmail = normalize(user.email || '');

  if (!trainerStr || trainerStr === 'tba' || /^\d+$/.test(trainerStr) || /^eq\s*\d+$/i.test(trainerStr)) return false;

  if (userName && (trainerStr.includes(userName) || userName.includes(trainerStr))) return true;

  const nameParts = userName.split(/\s+/).filter(p => p.length >= 3);
  const trainerParts = trainerStr.split(/[\/\s,\-]+/).filter(p => p.length >= 3);
  
  if (nameParts.length > 0) {
    const matchedTokens = nameParts.filter(part => trainerParts.some(tp => tp.includes(part) || part.includes(tp)));
    if (matchedTokens.length >= Math.min(2, nameParts.length)) return true;
  }

  const emailPrefix = userEmail.split('@')[0];
  const emailTokens = emailPrefix.split(/[\._\-]/).filter(t => t.length >= 3);
  if (emailTokens.length > 0) {
    const matchedEmailTokens = emailTokens.filter(tok => trainerParts.some(tp => tp.includes(tok) || tok.includes(tp)));
    if (matchedEmailTokens.length >= Math.min(2, emailTokens.length)) {
        console.log("Matched via email:", matchedEmailTokens);
        return true;
    }
  }

  return false;
};

console.log("Result:", isTrainerMatchingUser(evTrainer, user));
