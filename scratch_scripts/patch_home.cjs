const fs = require('fs');
const file = 'src/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const importLegal = `import LegalOnboardingModal from './components/LegalOnboardingModal';
import { getLegalStatusByParticipant } from './services/legalSignatureService';
`;

// Insert after other imports
content = content.replace("import { getVenueForTraining } from '../data/venuesData';", "import { getVenueForTraining } from '../data/venuesData';\n" + importLegal);

// Now inside the Home component, let's add state and effect for legal check
const homeComponentStart = `export default function Home() {`;
const legalState = `
  const [showLegalModal, setShowLegalModal] = useState(false);
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
  }, [currentUser]);
`;

content = content.replace(homeComponentStart, homeComponentStart + legalState);

// Now in the return block, render LegalOnboardingModal if needed.
// Find the first return statement of Home
const returnStart = `return (
    <div className=\`home-dashboard-container view-\${viewMode} theme-\${theme}\`>`;

const renderLegalModal = `
      {showLegalModal && (
        <LegalOnboardingModal
          currentUser={currentUser}
          sede={currentUser?.sede}
          onComplete={() => setShowLegalModal(false)}
        />
      )}
`;

content = content.replace(returnStart, returnStart + renderLegalModal);

// Also we should block the UI or show loading while checking? No, just showing the modal over the dashboard is fine, because the modal has a dark backdrop.

fs.writeFileSync(file, content);
console.log('Home.jsx patched with legal onboarding check');
