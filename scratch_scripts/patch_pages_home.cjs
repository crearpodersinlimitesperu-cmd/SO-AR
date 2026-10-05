const fs = require('fs');
const file = 'src/pages/Home.jsx';
let content = fs.readFileSync(file, 'utf8');

const importLegal = `import LegalOnboardingModal from '../components/LegalOnboardingModal';
import { getLegalStatusByParticipant } from '../services/legalSignatureService';
`;

if (!content.includes('LegalOnboardingModal')) {
  // Insert after other imports
  content = content.replace("import { getVenueForTraining } from '../data/venuesData';", "import { getVenueForTraining } from '../data/venuesData';\n" + importLegal);

  // Now inside the Home component
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

  fs.writeFileSync(file, content);
  console.log('src/pages/Home.jsx patched with legal onboarding check');
} else {
  console.log('src/pages/Home.jsx already has LegalOnboardingModal');
}
