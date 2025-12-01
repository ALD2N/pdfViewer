/**
 * OrphanPdfList.js - Liste des PDFs orphelins (non assignés à un dossier)
 */

(function() {
  const { useCallback } = React;

  function OrphanPdfList({ orphanPdfs, onOpenPdf }) {
    // Gérer le drag start
    const handleDragStart = useCallback((e, pdfPath) => {
      e.dataTransfer.setData('text/plain', pdfPath);
      e.dataTransfer.effectAllowed = 'copy';
    }, []);

    // Extraire le nom du fichier
    const getFileName = (filePath) => {
      if (typeof filePath !== 'string' || !filePath) {
        return 'Fichier inconnu';
      }
      const parts = filePath.split(/[/\\]/);
      return parts[parts.length - 1] || 'Fichier inconnu';
    };

    // Tronquer le chemin
    const truncatePath = (filePath, maxLength = 40) => {
      if (typeof filePath !== 'string' || !filePath) {
        return 'Chemin inconnu';
      }
      if (filePath.length <= maxLength) return filePath;
      const start = filePath.substring(0, 15);
      const end = filePath.substring(filePath.length - 20);
      return `${start}...${end}`;
    };

    return React.createElement('div', { className: 'orphan-pdf-list' },
      React.createElement('h3', null, 'PDFs orphelins'),
      orphanPdfs.length > 0
        ? React.createElement('div', { className: 'pdf-list' },
            orphanPdfs.map(pdfPath => 
              React.createElement('div', {
                key: pdfPath,
                className: 'pdf-item draggable',
                draggable: true,
                onDragStart: (e) => handleDragStart(e, pdfPath),
                onClick: () => onOpenPdf(pdfPath)
              },
                React.createElement('div', { className: 'pdf-icon' }, '📄'),
                React.createElement('div', { className: 'pdf-info' },
                  React.createElement('div', { className: 'pdf-name' }, getFileName(pdfPath)),
                  React.createElement('div', { className: 'pdf-path' }, truncatePath(pdfPath))
                ),
                React.createElement('div', { className: 'drag-handle' }, '⋮⋮')
              )
            )
          )
        : React.createElement('div', { className: 'empty-state' },
            React.createElement('div', { className: 'empty-state-icon' }, '📄'),
            React.createElement('p', null, 'Aucun PDF orphelin'),
            React.createElement('p', null, 'Tous les PDFs sont organisés dans des dossiers')
          )
    );
  }

  // Exposer globalement
  window.OrphanPdfList = OrphanPdfList;
})();