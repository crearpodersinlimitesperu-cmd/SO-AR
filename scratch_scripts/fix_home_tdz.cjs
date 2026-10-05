const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the block from the top
const blockToRemove = `  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isCheckingLegal, setIsCheckingLegal] = useState(true);

  // Check legal status on mount
  useEffect(() => {
    let isMounted = true;
    const checkLegal = async () => {
      if (!currentUser?.email) {
        if (isMounted) setIsCheckingLegal(false);
        return;
      }
      try {
        const sig = await getLegalStatusByParticipant(currentUser.email);
        if (isMounted) {
          // Si no tiene firma completada o le faltan campos, mostrar modal
          if (!sig || !sig.terms_accepted || !sig.nda_signed || !sig.privacy_accepted) {
            setShowLegalModal(true);
          }
          setIsCheckingLegal(false);
        }
      } catch (err) {
        console.error('Error checking legal status:', err);
        if (isMounted) setIsCheckingLegal(false);
      }
    };
    checkLegal();
    return () => { isMounted = false; };
  }, [currentUser]);\n\n`;

if (content.includes(blockToRemove)) {
  content = content.replace(blockToRemove, '');
} else {
  console.log("Could not find the block to remove exactly as written. Proceeding with caution...");
}

// 2. Insert it after useAuth()
const insertAfter = `  const { currentUser, logout, switchRole, reauthenticateGoogle } = useAuth();\n`;

const newBlock = `  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isCheckingLegal, setIsCheckingLegal] = useState(true);

  // Check legal status on mount
  useEffect(() => {
    let isMounted = true;
    const checkLegal = async () => {
      if (!currentUser?.email) {
        if (isMounted) setIsCheckingLegal(false);
        return;
      }
      try {
        const sig = await getLegalStatusByParticipant(currentUser.email);
        if (isMounted) {
          // Si no tiene firma completada o le faltan campos, mostrar modal
          if (!sig || !sig.terms_accepted || !sig.nda_signed || !sig.privacy_accepted) {
            setShowLegalModal(true);
          }
          setIsCheckingLegal(false);
        }
      } catch (err) {
        console.error('Error checking legal status:', err);
        if (isMounted) setIsCheckingLegal(false);
      }
    };
    checkLegal();
    return () => { isMounted = false; };
  }, [currentUser]);\n\n`;

content = content.replace(insertAfter, insertAfter + newBlock);

fs.writeFileSync(file, content);
console.log('Fixed TDZ in Home.jsx');
