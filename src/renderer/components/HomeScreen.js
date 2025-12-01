/**
 * HomeScreen.js - Écran d'accueil avec organisation en dossiers
 * Layout 3 colonnes : arborescence, orphelins, récents
 */

(function() {
  const { useMemo } = React;

  function HomeScreen({
    config,
    folders,
    expandedFolders,
    onOpenPdf,
    onOpenDialog,
    onRemovePdf,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onAssignPdf,
    onUnassignPdf,
    onToggleExpand
  }) {
    // Calculer les PDFs orphelins (non assignés à aucun dossier)
    const orphanPdfs = useMemo(() => {
      if (!config?.recentPdfs) return [];

      const assignedPdfs = new Set();
      for (const folder of Object.values(folders || {})) {
        for (const pdfPath of folder.pdfPaths || []) {
          assignedPdfs.add(pdfPath);
        }
      }

      return config.recentPdfs.filter(pdf => !assignedPdfs.has(pdf.path));
    }, [config?.recentPdfs, folders]);

    return React.createElement('div', { className: 'home-screen' },
      // En-tête
      React.createElement('header', { className: 'home-header' },
        React.createElement('h1', null, '📄 PDF Viewer'),
        React.createElement('p', null, 'Organisez vos PDFs dans des dossiers virtuels')
      ),

      // Layout 3 colonnes
      React.createElement('div', { className: 'home-layout' },
        // Colonne 1: Arborescence des dossiers
        React.createElement('div', { className: 'column folder-tree-column' },
          React.createElement(window.FolderTree, {
            folders: folders || {},
            onCreateFolder: onCreateFolder,
            onUpdateFolder: onUpdateFolder,
            onDeleteFolder: onDeleteFolder,
            onAssignPdf: onAssignPdf,
            onUnassignPdf: onUnassignPdf,
            expandedFolders: expandedFolders,
            onToggleExpand: onToggleExpand,
            onOpenPdf: onOpenPdf
          })
        ),

        // Colonne 2: PDFs orphelins
        React.createElement('div', { className: 'column orphan-pdfs-column' },
          React.createElement(window.OrphanPdfList, {
            orphanPdfs: orphanPdfs,
            onOpenPdf: onOpenPdf
          })
        ),

        // Colonne 3: PDFs récents
        React.createElement('div', { className: 'column recent-pdfs-column' },
          React.createElement(window.RecentPdfList, {
            recentPdfs: config?.recentPdfs || [],
            onOpenPdf: onOpenPdf,
            onRemovePdf: onRemovePdf
          })
        )
      ),

      // Actions globales
      React.createElement('footer', { className: 'home-actions' },
        React.createElement('button', {
          className: 'btn-primary open-pdf-btn',
          onClick: onOpenDialog
        }, '📂 Ouvrir un PDF')
      )
    );
  }

  // Exposer globalement pour utilisation dans App.js
  window.HomeScreen = HomeScreen;
})();