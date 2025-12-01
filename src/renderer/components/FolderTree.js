/**
 * FolderTree.js - Arborescence des dossiers virtuels
 * Affiche la hiérarchie des dossiers avec expansion/collapse
 */

(function() {
  const { useState, useCallback } = React;

  function FolderTree({ folders, onCreateFolder, onUpdateFolder, onDeleteFolder, onAssignPdf, expandedFolders, onToggleExpand, onOpenPdf }) {
    // État local pour le menu contextuel et drag-over
    const [contextMenu, setContextMenu] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    // État pour la modale
    const [modal, setModal] = useState(null);
    const [modalValue, setModalValue] = useState('');

    // Gérer le clic droit sur un nœud
    const handleContextMenu = useCallback((e, folderId) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        folderId
      });
    }, []);

    // Fermer le menu contextuel
    const closeContextMenu = useCallback(() => {
      setContextMenu(null);
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
           className: `folder-header ${hasChildren ? 'expandable' : ''} ${isDragOver ? 'drag-over' : ''}`,
           onContextMenu: (e) => handleContextMenu(e, folderId),
           onClick: hasChildren ? () => onToggleExpand(folderId) : undefined,
           onDrop: (e) => { handleDrop(e, folderId); setDragOverId(null); },
           onDragOver: handleDragOver,
           onDragEnter: (e) => handleDragEnter(e, folderId),
           onDragLeave: handleDragLeave
         },
          hasChildren && React.createElement('span', {
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
              title: `Ouvrir ${pdfPath}`
            },
              React.createElement('span', { className: 'pdf-icon-small' }, '📄'),
              React.createElement('span', { className: 'pdf-name-small' }, pdfPath.split(/[/\\]/).pop())
            )
          )
        )
      );
    }, [folders, expandedFolders, onToggleExpand, handleContextMenu, handleDrop, handleDragOver, handleDragEnter, handleDragLeave, dragOverId, onOpenPdf]);

    // Obtenir les dossiers racine
    const rootFolders = Object.keys(folders).filter(id => !folders[id].parentId);

    return React.createElement('div', { className: 'folder-tree' },
      React.createElement('h3', null, 'Dossiers'),
      React.createElement('button', {
        className: 'btn-secondary create-root-btn',
        onClick: () => {
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

      // Modale
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
      )
    );
  }

  // Exposer globalement
  window.FolderTree = FolderTree;
})();