/**
 * FolderTree.js - Arborescence des dossiers virtuels
 * Affiche la hiérarchie des dossiers avec expansion/collapse
 * Inclut le menu contextuel pour les PDFs (Ajouter à un autre dossier, Retirer du dossier)
 */

(function() {
  const { useState, useCallback, useMemo } = React;

  function FolderTree({ folders, onCreateFolder, onUpdateFolder, onDeleteFolder, onAssignPdf, onUnassignPdf, onRemovePdf, expandedFolders, onToggleExpand, onOpenPdf }) {
    // État local pour le menu contextuel des dossiers et drag-over
    const [contextMenu, setContextMenu] = useState(null);
    // État pour le menu contextuel des PDFs
    const [pdfContextMenu, setPdfContextMenu] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    // État pour la modale
    const [modal, setModal] = useState(null);
    const [modalValue, setModalValue] = useState('');
    // État pour la modale de sélection de dossier
    const [folderSelectModal, setFolderSelectModal] = useState(null);

    // Gérer le clic droit sur un dossier
    const handleContextMenu = useCallback((e, folderId) => {
      e.preventDefault();
      e.stopPropagation();
      setPdfContextMenu(null); // Fermer le menu PDF si ouvert
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        folderId
      });
    }, []);

    // Gérer le clic droit sur un PDF
    const handlePdfContextMenu = useCallback((e, pdfPath, currentFolderId) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu(null); // Fermer le menu dossier si ouvert
      setPdfContextMenu({
        x: e.clientX,
        y: e.clientY,
        pdfPath,
        currentFolderId
      });
    }, []);

    // Fermer le menu contextuel des dossiers
    const closeContextMenu = useCallback(() => {
      setContextMenu(null);
    }, []);

    // Fermer le menu contextuel des PDFs
    const closePdfContextMenu = useCallback(() => {
      setPdfContextMenu(null);
    }, []);

    // Créer un sous-dossier
    const handleCreateSubfolder = useCallback(() => {
      setModalValue('');
      setModal({
        type: 'prompt',
        title: 'Nom du nouveau dossier:',
        defaultValue: '',
        onConfirm: (name) => {
          if (name && name.trim()) {
            onCreateFolder(name.trim(), contextMenu.folderId);
          }
        }
      });
      closeContextMenu();
    }, [contextMenu, onCreateFolder, closeContextMenu]);

    // Renommer un dossier
    const handleRename = useCallback(() => {
      const folder = folders[contextMenu.folderId];
      setModalValue(folder.name);
      setModal({
        type: 'prompt',
        title: 'Nouveau nom:',
        defaultValue: folder.name,
        onConfirm: (newName) => {
          if (newName && newName.trim() && newName.trim() !== folder.name) {
            onUpdateFolder(contextMenu.folderId, { name: newName.trim() });
          }
        }
      });
      closeContextMenu();
    }, [contextMenu, folders, onUpdateFolder, closeContextMenu]);

    // Supprimer un dossier
    const handleDelete = useCallback(() => {
      setModal({
        type: 'confirm',
        title: 'Supprimer ce dossier et tous ses sous-dossiers ? Les PDFs ne seront pas supprimés.',
        onConfirm: () => {
          onDeleteFolder(contextMenu.folderId);
        }
      });
      closeContextMenu();
    }, [contextMenu, onDeleteFolder, closeContextMenu]);

    // Retirer un PDF du dossier actuel
    const handleRemovePdfFromFolder = useCallback(() => {
      if (pdfContextMenu && onUnassignPdf) {
        onUnassignPdf(pdfContextMenu.currentFolderId, pdfContextMenu.pdfPath);
      }
      closePdfContextMenu();
    }, [pdfContextMenu, onUnassignPdf, closePdfContextMenu]);

    // Ouvrir la modale de sélection de dossier pour ajouter le PDF à un autre dossier
    const handleAddPdfToAnotherFolder = useCallback(() => {
      if (!pdfContextMenu) return;
      
      // Calculer les dossiers où le PDF est déjà présent
      const foldersContainingPdf = new Set();
      for (const [folderId, folder] of Object.entries(folders)) {
        if (folder.pdfPaths && folder.pdfPaths.includes(pdfContextMenu.pdfPath)) {
          foldersContainingPdf.add(folderId);
        }
      }
      
      setFolderSelectModal({
        pdfPath: pdfContextMenu.pdfPath,
        excludeFolderIds: foldersContainingPdf
      });
      closePdfContextMenu();
    }, [pdfContextMenu, folders, closePdfContextMenu]);

    // Sélectionner un dossier dans la modale
    const handleSelectFolderForPdf = useCallback((folderId) => {
      if (folderSelectModal && onAssignPdf) {
        onAssignPdf(folderId, folderSelectModal.pdfPath);
      }
      setFolderSelectModal(null);
    }, [folderSelectModal, onAssignPdf]);

    // Liste des dossiers disponibles pour la modale de sélection (excluant ceux où le PDF est déjà)
    const availableFoldersForSelect = useMemo(() => {
      if (!folderSelectModal) return [];
      
      return Object.entries(folders)
        .filter(([id]) => !folderSelectModal.excludeFolderIds.has(id))
        .map(([id, folder]) => ({ id, name: folder.name, parentId: folder.parentId }));
    }, [folders, folderSelectModal]);

    // Construire le chemin complet d'un dossier (pour affichage)
    const getFolderPath = useCallback((folderId) => {
      const parts = [];
      let currentId = folderId;
      while (currentId && folders[currentId]) {
        parts.unshift(folders[currentId].name);
        currentId = folders[currentId].parentId;
      }
      return parts.join(' / ');
    }, [folders]);

    // Gérer le drop d'un PDF
    const handleDrop = useCallback((e, folderId) => {
      e.preventDefault();
      const pdfPath = e.dataTransfer.getData('text/plain');
      if (pdfPath) {
        onAssignPdf(folderId, pdfPath);
      }
    }, [onAssignPdf]);

    // Gérer le drag enter (feedback visuel)
    const handleDragEnter = useCallback((e, folderId) => {
      e.preventDefault();
      setDragOverId(folderId);
    }, []);

    // Gérer le drag leave
    const handleDragLeave = useCallback((e) => {
      e.preventDefault();
      setDragOverId(null);
    }, []);

    // Gérer le drag over
    const handleDragOver = useCallback((e) => {
      e.preventDefault();
    }, []);

    // Rendu récursif d'un nœud
    const renderFolderNode = useCallback((folderId) => {
      const folder = folders[folderId];
      if (!folder) return null;

      const isExpanded = expandedFolders.has(folderId);
      const hasChildren = folder.childrenIds && folder.childrenIds.length > 0;
      const hasPdfs = folder.pdfPaths && folder.pdfPaths.length > 0;
      const isDragOver = dragOverId === folderId;

      return React.createElement('div', { key: folderId, className: 'folder-node' },
         React.createElement('div', {
            className: `folder-header ${(hasChildren || hasPdfs) ? 'expandable' : ''} ${isDragOver ? 'drag-over' : ''}`,
           onContextMenu: (e) => handleContextMenu(e, folderId),
            onClick: (hasChildren || hasPdfs) ? () => onToggleExpand(folderId) : undefined,
           onDrop: (e) => { handleDrop(e, folderId); setDragOverId(null); },
           onDragOver: handleDragOver,
           onDragEnter: (e) => handleDragEnter(e, folderId),
           onDragLeave: handleDragLeave
         },
           (hasChildren || hasPdfs) && React.createElement('span', {
            className: `expand-icon ${isExpanded ? 'expanded' : 'collapsed'}`,
            onClick: (e) => { e.stopPropagation(); onToggleExpand(folderId); }
          }),
          React.createElement('span', { className: 'folder-icon' }, '📁'),
          React.createElement('span', { className: 'folder-name' }, folder.name),
          hasPdfs && React.createElement('span', { className: 'pdf-count' }, `(${folder.pdfPaths.length})`)
        ),
        isExpanded && hasChildren && React.createElement('div', { className: 'folder-children' },
          folder.childrenIds.map(childId => renderFolderNode(childId))
        ),
        isExpanded && hasPdfs && React.createElement('div', { className: 'folder-pdfs' },
          folder.pdfPaths.map(pdfPath => 
            React.createElement('div', {
              key: pdfPath,
              className: 'folder-pdf-item clickable',
              onClick: () => onOpenPdf && onOpenPdf(pdfPath),
              onContextMenu: (e) => handlePdfContextMenu(e, pdfPath, folderId),
              title: `Ouvrir ${pdfPath}`
            },
              React.createElement('span', { className: 'pdf-icon-small' }, '📄'),
              React.createElement('span', { className: 'pdf-name-small' }, pdfPath.split(/[/\\]/).pop())
            )
          )
        )
      );
    }, [folders, expandedFolders, onToggleExpand, handleContextMenu, handlePdfContextMenu, handleDrop, handleDragOver, handleDragEnter, handleDragLeave, dragOverId, onOpenPdf]);

    // Obtenir les dossiers racine
    const rootFolders = Object.keys(folders).filter(id => !folders[id].parentId);

    return React.createElement('div', { className: 'folder-tree' },
      React.createElement('h3', null, 'Dossiers'),
      React.createElement('button', {
        className: 'btn-secondary create-root-btn',
        onClick: () => {
          setModalValue('');
          setModal({
            type: 'prompt',
            title: 'Nom du nouveau dossier racine:',
            defaultValue: '',
            onConfirm: (name) => {
              if (name && name.trim()) {
                onCreateFolder(name.trim(), null);
              }
            }
          });
        }
      }, '+ Nouveau dossier'),

      React.createElement('div', { className: 'tree-container' },
        rootFolders.length > 0
          ? rootFolders.map(id => renderFolderNode(id))
          : React.createElement('div', { className: 'empty-tree' }, 'Aucun dossier')
      ),

      // Menu contextuel des dossiers
      contextMenu && React.createElement('div', {
        className: 'context-menu-overlay',
        onClick: closeContextMenu
      },
        React.createElement('div', {
          className: 'context-menu',
          style: { left: contextMenu.x, top: contextMenu.y }
        },
          React.createElement('div', {
            className: 'context-menu-item',
            onClick: handleCreateSubfolder
          }, 'Créer sous-dossier'),
          React.createElement('div', {
            className: 'context-menu-item',
            onClick: handleRename
          }, 'Renommer'),
          React.createElement('div', {
            className: 'context-menu-item delete',
            onClick: handleDelete
          }, 'Supprimer')
        )
      ),

      // Menu contextuel des PDFs
      pdfContextMenu && React.createElement('div', {
        className: 'context-menu-overlay',
        onClick: closePdfContextMenu
      },
        React.createElement('div', {
          className: 'context-menu',
          style: { left: pdfContextMenu.x, top: pdfContextMenu.y }
        },
          React.createElement('div', {
            className: 'context-menu-item',
            onClick: handleAddPdfToAnotherFolder
          }, 'Ajouter à un autre dossier'),
          React.createElement('div', {
            className: 'context-menu-item',
            onClick: handleRemovePdfFromFolder
          }, 'Retirer du dossier'),
          React.createElement('div', {
            className: 'context-menu-item delete',
            onClick: () => {
              if (pdfContextMenu && onRemovePdf) {
                onRemovePdf(pdfContextMenu.pdfPath);
              }
              closePdfContextMenu();
            }
          }, 'Supprimer')
        )
      ),

      // Modale de confirmation/prompt
      modal && React.createElement('div', {
        className: 'modal-overlay',
        onClick: () => setModal(null)
      },
        React.createElement('div', {
          className: 'modal',
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('div', { className: 'modal-title' }, modal.title),
          modal.type === 'prompt' && React.createElement('input', {
            type: 'text',
            value: modalValue,
            onChange: (e) => setModalValue(e.target.value),
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                modal.onConfirm(modalValue);
                setModal(null);
              } else if (e.key === 'Escape') {
                setModal(null);
              }
            },
            autoFocus: true
          }),
          React.createElement('div', { className: 'modal-buttons' },
            React.createElement('button', {
              className: 'btn-primary',
              onClick: () => {
                modal.onConfirm(modal.type === 'prompt' ? modalValue : undefined);
                setModal(null);
              }
            }, 'OK'),
            React.createElement('button', {
              className: 'btn-secondary',
              onClick: () => setModal(null)
            }, 'Annuler')
          )
        )
      ),

      // Modale de sélection de dossier
      folderSelectModal && React.createElement('div', {
        className: 'modal-overlay',
        onClick: () => setFolderSelectModal(null)
      },
        React.createElement('div', {
          className: 'modal folder-select-modal',
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('div', { className: 'modal-title' }, 'Sélectionner un dossier'),
          React.createElement('div', { className: 'modal-subtitle' }, 
            `Ajouter "${folderSelectModal.pdfPath.split(/[/\\]/).pop()}" à :`
          ),
          React.createElement('div', { className: 'folder-select-list' },
            availableFoldersForSelect.length > 0
              ? availableFoldersForSelect.map(folder => 
                  React.createElement('div', {
                    key: folder.id,
                    className: 'folder-select-item',
                    onClick: () => handleSelectFolderForPdf(folder.id)
                  },
                    React.createElement('span', { className: 'folder-icon' }, '📁'),
                    React.createElement('span', { className: 'folder-select-name' }, getFolderPath(folder.id))
                  )
                )
              : React.createElement('div', { className: 'folder-select-empty' }, 
                  'Ce PDF est déjà dans tous les dossiers disponibles'
                )
          ),
          React.createElement('div', { className: 'modal-buttons' },
            React.createElement('button', {
              className: 'btn-secondary',
              onClick: () => setFolderSelectModal(null)
            }, 'Annuler')
          )
        )
      )
    );
  }

  // Exposer globalement
  window.FolderTree = FolderTree;
})();
