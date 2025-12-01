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
    const [folders, setFolders] = useState({});
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // Charger la configuration et les dossiers au démarrage
    useEffect(() => {
      loadConfig();
      loadFolders();
    }, []);

    // Charger la configuration depuis le main process
    const loadConfig = async () => {
      try {
        const cfg = await window.electronAPI.getRecentPdfs();
        setConfig(cfg);
      } catch (error) {
        console.error('Erreur chargement config:', error);
      }
    };

    // Charger les dossiers
    const loadFolders = async () => {
      try {
        const result = await window.electronAPI.loadFolders();
        if (result.success) {
          setFolders(result.folders);
        }
      } catch (error) {
        console.error('Erreur chargement dossiers:', error);
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

    // Gestion des dossiers
    const createFolder = useCallback(async (name, parentId) => {
      try {
        const result = await window.electronAPI.createFolder({ name, parentId });
        if (result.success) {
          setFolders(result.folders);
        } else {
          console.error(result.error);
        }
      } catch (error) {
        console.error('Erreur création dossier:', error);
      }
    }, []);

    const updateFolder = useCallback(async (id, updates) => {
      try {
        const result = await window.electronAPI.updateFolder({ id, updates });
        if (result.success) {
          setFolders(result.folders);
        } else {
          console.error(result.error);
        }
      } catch (error) {
        console.error('Erreur mise à jour dossier:', error);
      }
    }, []);

    const deleteFolder = useCallback(async (id) => {
      try {
        const result = await window.electronAPI.deleteFolder({ id });
        if (result.success) {
          setFolders(result.folders);
        } else {
          console.error(result.error);
        }
      } catch (error) {
        console.error('Erreur suppression dossier:', error);
      }
    }, []);

    const assignPdfToFolder = useCallback(async (folderId, pdfPath) => {
      try {
        const result = await window.electronAPI.assignPdfToFolder({ folderId, pdfPath });
        if (result.success) {
          setFolders(result.folders);
        } else {
          console.error(result.error);
        }
      } catch (error) {
        console.error('Erreur assignation PDF:', error);
      }
    }, []);

    const unassignPdfFromFolder = useCallback(async (folderId, pdfPath) => {
      try {
        const result = await window.electronAPI.unassignPdfFromFolder({ folderId, pdfPath });
        if (result.success) {
          setFolders(result.folders);
        } else {
          console.error(result.error);
        }
      } catch (error) {
        console.error('Erreur désassignation PDF:', error);
      }
    }, []);

    // Gestion de l'expansion des dossiers
    const toggleFolderExpansion = useCallback((folderId) => {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        return newSet;
      });
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
            folders: folders,
            expandedFolders: expandedFolders,
            onOpenPdf: openPdf,
            onOpenDialog: openFileDialog,
            onRemovePdf: removePdf,
            onCreateFolder: createFolder,
            onUpdateFolder: updateFolder,
            onDeleteFolder: deleteFolder,
            onAssignPdf: assignPdfToFolder,
            onUnassignPdf: unassignPdfFromFolder,
            onToggleExpand: toggleFolderExpansion
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