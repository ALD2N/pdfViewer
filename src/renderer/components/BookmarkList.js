/**
 * BookmarkList.js - Composant de gestion de la liste des bookmarks
 * Supporte le drag & drop pour réorganisation, preview et navigation
 * R6: Ordre réorganisable par drag & drop
 */

(function() {
  const { useState, useCallback, useRef, useEffect } = React;
  const DISPLAY_MODES = {
    THUMBNAILS: 'thumbnails',
    COMPACT: 'compact'
  };

  function BookmarkList({ bookmarks, onNavigate, onPreview, onUpdate, onDelete, onReorder, showHeader = true }) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.THUMBNAILS);
    const clickTimeoutRef = useRef(null);

    useEffect(() => {
      return () => {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
      };
    }, []);

    // Commencer l'édition d'un titre
    const startEditing = useCallback((bookmark) => {
      setEditingId(bookmark.id);
      setEditTitle(bookmark.title);
    }, []);

    // Sauvegarder l'édition
    // INV-02: Titre non-vide
    const saveEditing = useCallback(() => {
      if (editingId && editTitle.trim()) {
        onUpdate(editingId, { title: editTitle.trim() });
      } else if (editingId && !editTitle.trim()) {
        // Titre vide: annuler l'édition
        const bookmark = bookmarks.find(b => b.id === editingId);
        if (bookmark) {
          setEditTitle(bookmark.title);
        }
      }
      setEditingId(null);
      setEditTitle('');
    }, [editingId, editTitle, onUpdate, bookmarks]);

    // Annuler l'édition
    const cancelEditing = useCallback(() => {
      setEditingId(null);
      setEditTitle('');
    }, []);

    // Gérer la touche Enter dans l'input d'édition
    const handleEditKeyDown = useCallback((e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEditing();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    }, [saveEditing, cancelEditing]);

    // Drag & drop - début du drag
    const handleDragStart = useCallback((e, index) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    }, []);

    // Drag & drop - survol d'une zone de drop
    const handleDragOver = useCallback((e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }, []);

    // Drag & drop - drop
    const handleDrop = useCallback((e, dropIndex) => {
      e.preventDefault();
      
      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDraggedIndex(null);
        return;
      }

      // Réorganiser les bookmarks localement pour preview immédiat
      const newBookmarks = [...bookmarks];
      const [draggedBookmark] = newBookmarks.splice(draggedIndex, 1);
      newBookmarks.splice(dropIndex, 0, draggedBookmark);

      // Extraire les IDs dans le nouvel ordre
      const bookmarkIds = newBookmarks.map(b => b.id);
      
      // Envoyer au parent pour persistance
      onReorder(bookmarkIds);
      setDraggedIndex(null);
    }, [draggedIndex, bookmarks, onReorder]);

    // Drag & drop - fin du drag
    const handleDragEnd = useCallback(() => {
      setDraggedIndex(null);
    }, []);

    const toggleDisplayMode = useCallback(() => {
      setDisplayMode((current) =>
        current === DISPLAY_MODES.THUMBNAILS
          ? DISPLAY_MODES.COMPACT
          : DISPLAY_MODES.THUMBNAILS
      );
    }, []);

    const handleItemClick = useCallback((bookmark) => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        return;
      }

      clickTimeoutRef.current = setTimeout(() => {
        onPreview(bookmark);
        clickTimeoutRef.current = null;
      }, 180);
    }, [onPreview]);

    const handleItemDoubleClick = useCallback((bookmark) => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      startEditing(bookmark);
    }, [startEditing]);

    // Gérer le clic droit pour le menu contextuel
    const handleContextMenu = useCallback((e, bookmark) => {
      e.preventDefault();
      e.stopPropagation();

      const template = [
        {
          label: 'Supprimer',
          click: () => onDelete(bookmark.id)
        }
      ];

      const menu = window.electronAPI.Menu.buildFromTemplate(template);
      menu.popup();
    }, [onDelete]);

    const sectionClassName = `bookmarks-section ${displayMode === DISPLAY_MODES.COMPACT ? 'compact-mode' : 'thumbnails-mode'}`;
    const listClassName = `bookmarks-list ${displayMode}`;

    return React.createElement('div', { className: sectionClassName },
      showHeader && React.createElement('div', { className: 'bookmarks-header' },
        React.createElement('div', { className: 'bookmarks-title' },
          `Bookmarks (${bookmarks.length})`
        ),
        React.createElement('button', {
          className: 'btn-secondary btn-small display-mode-btn',
          onClick: toggleDisplayMode,
          title: displayMode === DISPLAY_MODES.THUMBNAILS
            ? 'Passer en mode compact'
            : 'Afficher les vignettes',
          'aria-label': displayMode === DISPLAY_MODES.THUMBNAILS
            ? 'Passer en mode compact'
            : 'Afficher les vignettes'
        },
          displayMode === DISPLAY_MODES.THUMBNAILS ? '▢' : '≡'
        )
      ),
      
      bookmarks.length > 0
        ? React.createElement('div', { className: listClassName },
            bookmarks.map((bookmark, index) =>
               React.createElement('div', {
                 key: bookmark.id,
                 className: `bookmark-item ${draggedIndex === index ? 'dragging' : ''} ${displayMode === DISPLAY_MODES.COMPACT ? 'compact' : ''}`,
                 draggable: true,
                 onDragStart: (e) => handleDragStart(e, index),
                 onDragOver: handleDragOver,
                 onDrop: (e) => handleDrop(e, index),
                 onDragEnd: handleDragEnd,
                 onClick: () => handleItemClick(bookmark),
                 onContextMenu: (e) => handleContextMenu(e, bookmark)
               },
                displayMode === DISPLAY_MODES.THUMBNAILS &&
                  React.createElement('div', { className: 'bookmark-thumbnail' },
                    bookmark.thumbnailPath
                      ? React.createElement('img', {
                          src: `file://${bookmark.thumbnailPath}`,
                          alt: `Page ${bookmark.page}`,
                          onError: (e) => {
                            console.error('Erreur chargement miniature:', bookmark.thumbnailPath);
                            e.target.style.display = 'none';
                          }
                        })
                      : React.createElement('div', {
                          style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: 'var(--text-muted)'
                          }
                        }, '📄')
                  ),

                // Informations
                React.createElement('div', {
                  className: 'bookmark-info',
                  onDoubleClick: (e) => {
                    e.stopPropagation();
                    handleItemDoubleClick(bookmark);
                  }
                },
                  editingId === bookmark.id
                    ? React.createElement('input', {
                        type: 'text',
                        value: editTitle,
                        onChange: (e) => setEditTitle(e.target.value),
                        onKeyDown: handleEditKeyDown,
                        onBlur: saveEditing,
                        onClick: (e) => e.stopPropagation(),
                        autoFocus: true,
                        style: {
                          width: '100%',
                          fontSize: '12px',
                          padding: '2px 4px',
                          border: '1px solid var(--accent)',
                          borderRadius: '2px',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)'
                        }
                      })
                    : React.createElement('div', {
                        className: 'bookmark-title',
                        title: 'Double-cliquer pour éditer'
                      }, bookmark.title),
                  React.createElement('div', { className: 'bookmark-page' }, `Page ${bookmark.page}`)
                ),

                // Actions
                React.createElement('div', { className: 'bookmark-actions' },
                  React.createElement('button', {
                    className: 'btn-secondary btn-small',
                    onClick: (e) => {
                      e.stopPropagation();
                      onNavigate(bookmark);
                    },
                    title: 'Aller à la page'
                  }, '➡️')
                )
              )
            )
          )
        : React.createElement('div', { className: 'bookmarks-empty' },
            'Aucun bookmark. Cliquez sur "🔖 Bookmark" pour en ajouter.'
          )
    );
  }

  // Exposer globalement
  window.BookmarkList = BookmarkList;
})();
