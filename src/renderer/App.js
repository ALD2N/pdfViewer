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
    }, [loadConfig]);

    // Supprimer un PDF des récents
    const removeFromRecents = useCallback(async (pdfPath) => {
      try {
        const result = await window.electronAPI.removeRecentPdf(pdfPath);
        if (result.success) {
          await loadConfig();
        } else {
          console.error(result.error || 'Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Erreur suppression PDF récent:', error);
      }
    }, [loadConfig]);

    // Supprimer définitivement un PDF du disque
    const deletePdf = useCallback(async (pdfPath) => {
      try {
        const result = await window.electronAPI.deletePdf(pdfPath);
        if (result.success) {
          await loadConfig();
        } else if (result.code === 'PERMISSION_DENIED') {
          console.error('Permission refusée : impossible de supprimer ce fichier');
        } else {
          console.error(result.error || 'Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Erreur suppression PDF:', error);
      }
    }, [loadConfig]);

    // Oublier un PDF : supprimer toutes les données mais laisser le fichier intact
    const forgetPdf = useCallback(async (pdfPath) => {
      try {
        const result = await window.electronAPI.forgetPdf(pdfPath);
        if (result.success) {
          await loadConfig();
        } else {
          console.error(result.error || 'Erreur lors de l\'oubli du PDF');
        }
      } catch (error) {
        console.error('Erreur oubli PDF:', error);
      }
    }, [loadConfig]);

    // Affichage du loading
    if (loading) {
      return React.createElement('div', { className: 'loading-overlay' },
        React.createElement('div', { className: 'spinner' }),
        React.createElement('p', null, 'Chargement...')
      );
    }

    // Rendu de l'application
    return React.createElement('div', { id: 'app' },
      // Rendu conditionnel selon la vue courante
      currentView === 'home'
        ? React.createElement(HomeScreen, {
            config: config,
            onOpenPdf: openPdf,
            onOpenDialog: openFileDialog,
            onRemovePdf: removeFromRecents,
            onForgetPdf: forgetPdf,
            onDeletePdf: deletePdf
          })
        : React.createElement(PdfViewer, {
            pdfData: currentPdf,
            onGoHome: goHome
          })
    );
  }

  // Rendu de l'application
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
})();
