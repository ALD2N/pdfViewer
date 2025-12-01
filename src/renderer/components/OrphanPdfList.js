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
    const getFileName = (pdf) => {
      if (typeof pdf === 'object' && pdf.name) {
        return pdf.name;
      }
      if (typeof pdf === 'string') {
        if (!pdf) return 'Fichier inconnu';
        const parts = pdf.split(/[/\\]/);
        return parts[parts.length - 1] || 'Fichier inconnu';
      }
      return 'Fichier inconnu';
    };

    // Tronquer le chemin
    const truncatePath = (pdf) => {
      let filePath;
      if (typeof pdf === 'object' && pdf.path) {
        filePath = pdf.path;
      } else if (typeof pdf === 'string') {
        filePath = pdf;
      } else {
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
            orphanPdfs.map(pdf => 
              React.createElement('div', {
                key: pdf.path || pdf,
                className: 'pdf-item draggable',
                draggable: true,
                onDragStart: (e) => handleDragStart(e, pdf.path || pdf),
                onClick: () => onOpenPdf(pdf.path || pdf)
              },
                React.createElement('div', { className: 'pdf-icon' }, '📄'),
                React.createElement('div', { className: 'pdf-info' },
                  React.createElement('div', { className: 'pdf-name' }, getFileName(pdf)),
                  React.createElement('div', { className: 'pdf-path' }, truncatePath(pdf))
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