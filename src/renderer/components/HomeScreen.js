/**
 * HomeScreen.js - Écran d'accueil avec liste des PDFs récents
 * Permet d'ouvrir un nouveau PDF ou de reprendre un PDF récent
 */

(function() {
  const { useState, useCallback } = React;

  function HomeScreen({ config, onOpenPdf, onOpenDialog, onRemovePdf, onForgetPdf, onDeletePdf }) {
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'remove' | 'forget' | 'delete', path: string }

    const recentPdfs = config?.recentPdfs || [];

    // Extraire le nom du fichier depuis le chemin
    // Gère les cas où filePath n'est pas une string valide (INV-05, R4)
    const getFileName = (filePath) => {
      // Vérification de type : filePath doit être une string non vide
      if (typeof filePath !== 'string' || !filePath) {
        return 'Fichier inconnu';
      }
      const parts = filePath.split(/[/\\]/);
      const fileName = parts[parts.length - 1];
      // Fallback si le split retourne un élément vide (ex: chemin terminant par /)
      return fileName || 'Fichier inconnu';
    };

    // Tronquer le chemin pour l'affichage
    // Gère les cas où filePath n'est pas une string valide (INV-05, R4)
    const truncatePath = (filePath, maxLength = 50) => {
      // Vérification de type : filePath doit être une string non vide
      if (typeof filePath !== 'string' || !filePath) {
        return 'Chemin inconnu';
      }
      if (filePath.length <= maxLength) return filePath;
      const start = filePath.substring(0, 20);
      const end = filePath.substring(filePath.length - 25);
      return `${start}...${end}`;
    };

    // Gérer le clic sur un PDF
    const handlePdfClick = useCallback((pdfPath) => {
      onOpenPdf(pdfPath);
    }, [onOpenPdf]);

    // Demander confirmation de retrait de l'historique
    const askRemoveConfirmation = useCallback((e, pdfPath) => {
      e.stopPropagation();
      setConfirmAction({ type: 'remove', path: pdfPath });
    }, []);

    // Demander confirmation d'oubli du PDF
    const askForgetConfirmation = useCallback((e, pdfPath) => {
      e.stopPropagation();
      setConfirmAction({ type: 'forget', path: pdfPath });
    }, []);

    // Demander confirmation de suppression du fichier
    const askDeleteConfirmation = useCallback((e, pdfPath) => {
      e.stopPropagation();
      setConfirmAction({ type: 'delete', path: pdfPath });
    }, []);

    // Confirmer l'action
    const confirmCurrentAction = useCallback(() => {
      if (!confirmAction) return;
      
      if (confirmAction.type === 'remove') {
        onRemovePdf(confirmAction.path);
      } else if (confirmAction.type === 'forget') {
        onForgetPdf(confirmAction.path);
      } else if (confirmAction.type === 'delete') {
        onDeletePdf(confirmAction.path);
      }
      
      setConfirmAction(null);
    }, [confirmAction, onRemovePdf, onForgetPdf, onDeletePdf]);

    // Annuler l'action
    const cancelAction = useCallback(() => {
      setConfirmAction(null);
    }, []);

    return React.createElement('div', { className: 'home-screen' },
      // En-tête
      React.createElement('header', { className: 'home-header' },
        React.createElement('h1', null, '📄 PDF Viewer'),
        React.createElement('p', null, 'Visualiseur de PDF avec système de bookmarks')
      ),

      // Liste des PDFs récents
      React.createElement('section', { className: 'recent-pdfs' },
        React.createElement('h2', { className: 'recent-pdfs-title' }, 'PDFs récents'),
        
        recentPdfs.length > 0
          ? React.createElement('div', { className: 'pdf-list' },
              recentPdfs.map((item, index) => {
                const pdfPath = typeof item === 'object' && item.path ? item.path : item;
                return React.createElement('div', {
                  key: pdfPath || `pdf-${index}`,
                  className: 'pdf-item',
                  onClick: () => handlePdfClick(pdfPath)
                },
                  React.createElement('div', { className: 'pdf-icon' }, 'PDF'),
                  React.createElement('div', { className: 'pdf-info' },
                    React.createElement('div', { className: 'pdf-name' }, getFileName(pdfPath)),
                    React.createElement('div', { className: 'pdf-path' }, truncatePath(pdfPath))
                  ),
                   React.createElement('div', { className: 'pdf-actions' },
                     React.createElement('button', {
                       className: 'btn-secondary',
                       onClick: (e) => askRemoveConfirmation(e, pdfPath),
                       title: 'Retirer de l\'historique sans supprimer le fichier'
                     }, '🗑️ Retirer'),
                     React.createElement('button', {
                       className: 'btn-warning',
                       onClick: (e) => askForgetConfirmation(e, pdfPath),
                       title: 'Supprimer toutes les données (bookmarks, miniatures) mais laisser le fichier'
                     }, '💭 Oublier'),
                     React.createElement('button', {
                       className: 'btn-danger',
                       onClick: (e) => askDeleteConfirmation(e, pdfPath),
                       title: 'Supprimer définitivement le fichier du disque'
                     }, '❌ Supprimer')
                   )
                );
              })
            )
          : React.createElement('div', { className: 'empty-state' },
              React.createElement('div', { className: 'empty-state-icon' }, '📄'),
              React.createElement('p', null, 'Aucun PDF récent'),
              React.createElement('p', null, 'Ouvrez un PDF pour commencer')
            )
      ),

      // Actions
      React.createElement('footer', { className: 'home-actions' },
        React.createElement('button', {
          className: 'btn-primary open-pdf-btn',
          onClick: onOpenDialog
        }, '📂 Ouvrir un PDF')
      ),

      // Dialog de confirmation
      confirmAction && React.createElement('div', { className: 'confirm-overlay' },
        React.createElement('div', { className: 'confirm-modal' },
          React.createElement('h3', null, 
            confirmAction.type === 'remove' 
              ? 'Retirer de l\'historique ?' 
              : confirmAction.type === 'forget'
              ? 'Oublier ce PDF ?'
              : '⚠️ Supprimer le fichier ?'
          ),
          React.createElement('p', null, 
            confirmAction.type === 'remove'
              ? 'Ce PDF sera retiré de l\'historique mais le fichier restera sur votre disque.'
              : confirmAction.type === 'forget'
              ? 'Toutes les données associées (bookmarks, miniatures) seront supprimées, mais le fichier PDF restera sur votre disque.'
              : 'Le fichier PDF sera définitivement supprimé du disque. Cette action est irréversible !'
          ),
          React.createElement('div', { className: 'confirm-actions' },
            React.createElement('button', {
              className: 'confirm-btn btn-secondary',
              onClick: cancelAction
            }, 'Annuler'),
            React.createElement('button', {
              className: `confirm-btn ${confirmAction.type === 'delete' ? 'btn-danger' : confirmAction.type === 'forget' ? 'btn-warning' : 'btn-primary'}`,
              onClick: confirmCurrentAction
            }, confirmAction.type === 'remove' ? 'Retirer' : confirmAction.type === 'forget' ? 'Oublier' : 'Supprimer définitivement')
          )
        )
      )
    );
  }

  // Exposer globalement pour utilisation dans App.js
  window.HomeScreen = HomeScreen;
})();