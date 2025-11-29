/**
 * App.js - Composant racine de l'application PDF Viewer
 * Gère la navigation entre l'écran d'accueil et la visionneuse PDF
 */

(function() {
  const { useState, useEffect, useCallback } = React;

  // Composant principal de l'application
  function App() {
    const [currentView, setCurrentView] = useState('home'); // 'home' ou 'viewer'
    const [currentPdf, setCurrentPdf] = useState(null);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    // Charger la configuration au démarrage
    useEffect(() => {
      loadConfig();
    }, []);

    // Charger la configuration depuis le main process
    const loadConfig = async () => {
      try {
        const cfg = await window.electronAPI.getRecentPdfs();
        setConfig(cfg);
      } catch (error) {
        console.error('Erreur chargement config:', error);
      } finally {
        setLoading(false);
      }
    };

    // Ouvrir un PDF
    const openPdf = useCallback(async (pdfPath) => {
      try {
        setLoading(true);
        
        // Charger le PDF via le main process
        const result = await window.electronAPI.loadPdf(pdfPath);
        
        if (!result.success) {
          console.error('Erreur lors du chargement du PDF:', result.error);
          setLoading(false);
          return;
        }

        setCurrentPdf({
          path: pdfPath,
          data: result.data,
          hash: result.hash,
          hashChanged: result.hashChanged,
          bookmarks: result.bookmarks
        });
        
        setCurrentView('viewer');
        setLoading(false);
      } catch (error) {
        console.error('Erreur ouverture PDF:', error);
        setLoading(false);
      }
    }, []);

    // Ouvrir le dialogue de fichier
    const openFileDialog = useCallback(async () => {
      try {
        const filePath = await window.electronAPI.openPdfDialog();
        if (filePath) {
          await openPdf(filePath);
        }
      } catch (error) {
        console.error('Erreur dialogue fichier:', error);
      }
    }, [openPdf]);

    // Retourner à l'écran d'accueil
    const goHome = useCallback(async () => {
      setCurrentView('home');
      setCurrentPdf(null);
      await loadConfig();
    }, []);

    // Retirer un PDF : supprime de l'historique ET nettoie toutes les données associées
    // (bookmarks, miniatures) mais laisse le fichier physique intact
    const removePdf = useCallback(async (pdfPath) => {
      try {
        const result = await window.electronAPI.forgetPdf(pdfPath);
        if (result.success) {
          await loadConfig();
        } else {
          console.error(result.error || 'Erreur lors du retrait du PDF');
        }
      } catch (error) {
        console.error('Erreur retrait PDF:', error);
      }
    }, []);

    // Affichage du loading
    if (loading) {
      return React.createElement('div', { className: 'loading-overlay' },
        React.createElement('div', { className: 'spinner' }),
        React.createElement('p', null, 'Chargement...')
      );
    }

    // Rendu de l'application
    return React.createElement('div', { id: 'app' },
      (currentView === 'home'
        ? React.createElement(window.HomeScreen, {
            config: config,
            onOpenPdf: openPdf,
            onOpenDialog: openFileDialog,
            onRemovePdf: removePdf
          })
        : React.createElement(window.PdfViewer, {
            pdfData: currentPdf,
            onGoHome: goHome
          }))
    );
  }

  // Rendu de l'application
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
})();