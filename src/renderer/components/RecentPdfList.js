/**
 * RecentPdfList.js - Liste des PDFs récemment ouverts
 */

(function() {
  const { useState, useCallback } = React;

  function RecentPdfList({ recentPdfs, onOpenPdf, onRemovePdf }) {
    const [confirmRemove, setConfirmRemove] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

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

    // Fermer le menu contextuel
    const closeContextMenu = useCallback(() => {
      setContextMenu(null);
    }, []);

    // Demander confirmation de retrait
    const askRemoveConfirmation = useCallback((pdfPath) => {
      setConfirmRemove(pdfPath);
      closeContextMenu();
    }, [closeContextMenu]);

    // Confirmer le retrait
    const confirmRemoveAction = useCallback(() => {
      if (confirmRemove) {
        onRemovePdf(confirmRemove);
        setConfirmRemove(null);
      }
    }, [confirmRemove, onRemovePdf]);

    // Annuler le retrait
    const cancelRemove = useCallback(() => {
      setConfirmRemove(null);
    }, []);

    // Gérer le menu contextuel
    const handleContextMenu = useCallback((e, pdfPath) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, pdfPath });
    }, []);

    return React.createElement('div', { className: 'recent-pdf-list' },
      React.createElement('h3', null, 'PDFs récents'),
      recentPdfs.length > 0
        ? React.createElement('div', { className: 'pdf-list' },
            recentPdfs.map(item => {
              const pdfPath = typeof item === 'object' && item.path ? item.path : item;
              const exists = typeof item === 'object' ? item.exists : true;
               return React.createElement('div', {
                 key: pdfPath,
                 className: `pdf-item draggable ${!exists ? 'missing' : ''}`,
                 draggable: true,
                 onDragStart: (e) => handleDragStart(e, pdfPath),
                 onClick: () => exists && onOpenPdf(pdfPath),
                 onContextMenu: (e) => handleContextMenu(e, pdfPath)
               },
                React.createElement('div', { className: 'pdf-icon' }, exists ? '📄' : '❌'),
                React.createElement('div', { className: 'pdf-info' },
                  React.createElement(window.TruncatedText, {
                    className: 'pdf-name',
                    text: getFileName(pdfPath)
                  }),
                  React.createElement('div', { className: 'pdf-path' }, truncatePath(pdfPath)),
                  !exists && React.createElement('div', { className: 'missing-note' }, 'Fichier introuvable')
                 ),
                 React.createElement('div', { className: 'drag-handle' }, '⋮⋮')
              );
            })
          )
        : React.createElement('div', { className: 'empty-state' },
            React.createElement('div', { className: 'empty-state-icon' }, '📄'),
            React.createElement('p', null, 'Aucun PDF récent'),
            React.createElement('p', null, 'Ouvrez un PDF pour commencer')
          ),

      // Dialog de confirmation
      confirmRemove && React.createElement('div', { className: 'confirm-overlay' },
        React.createElement('div', { className: 'confirm-modal' },
          React.createElement('h3', null, 'Retirer ce PDF ?'),
          React.createElement('p', null, 
            'Ce PDF sera retiré de la liste des récents et toutes les données associées (bookmarks, miniatures) seront supprimées.'
          ),
          React.createElement('p', { className: 'confirm-note' }, 
            'Le fichier PDF restera sur votre disque.'
          ),
          React.createElement('div', { className: 'confirm-actions' },
            React.createElement('button', {
              className: 'confirm-btn btn-secondary',
              onClick: cancelRemove
            }, 'Annuler'),
            React.createElement('button', {
              className: 'confirm-btn btn-danger',
              onClick: confirmRemoveAction
            }, 'Retirer')
          )
        )
      ),

      // Menu contextuel
      contextMenu && React.createElement('div', {
        className: 'context-menu-overlay',
        onClick: closeContextMenu
      },
        React.createElement('div', {
          className: 'context-menu',
          style: { left: contextMenu.x, top: contextMenu.y }
        },
          React.createElement('div', {
            className: 'context-menu-item delete',
            onClick: () => askRemoveConfirmation(contextMenu.pdfPath)
          }, 'Supprimer')
        )
      )
    );
  }

  // Exposer globalement
  window.RecentPdfList = RecentPdfList;
})();
