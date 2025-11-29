/**
 * PdfViewer.js - Composant de visualisation PDF avec bookmarks
 * Utilise PDF.js pour le rendu, supporte zoom, navigation et bookmarks
 * Inclut TextLayer (sélection de texte) et AnnotationLayer (liens cliquables)
 */

(function() {
  const { useState, useRef, useEffect, useCallback } = React;

  function PdfViewer({ pdfData, onGoHome }) {
    // Refs pour le rendu
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const viewerContentRef = useRef(null);
    const textLayerRef = useRef(null);
    const annotationLayerRef = useRef(null);
    const [viewerContentEl, setViewerContentEl] = useState(null);
    
    // États UI
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);
    
    // États bookmarks
    const [bookmarks, setBookmarks] = useState(pdfData.bookmarks || []);
    const [previewBookmark, setPreviewBookmark] = useState(null);
    const [isAddingBookmark, setIsAddingBookmark] = useState(false);
    
    // Refs pour la gestion des rendus (mutex/queue system)
    const pdfDocumentRef = useRef(null);
    const renderTaskRef = useRef(null);
    const isRenderingRef = useRef(false);
    const renderQueueRef = useRef([]);
    const isMountedRef = useRef(true);
    const viewStateRef = useRef({ page: 1, zoom: 1 });
    // NOUVEAU: Flag pour suivre l'état de destruction du document
    const isDestroyingRef = useRef(false);
    // NOUVEAU: AbortController pour les opérations asynchrones
    const abortControllerRef = useRef(null);

    const attachViewerContentRef = useCallback((node) => {
      viewerContentRef.current = node;
      setViewerContentEl(node);
    }, []);

    // Accès à PDF.js depuis window
    const pdfjsLib = window.pdfjsLib;

    // NOUVEAU: Fonction pour vérifier si le document est valide et non détruit
    const isDocumentValid = useCallback(() => {
      return (
        isMountedRef.current &&
        !isDestroyingRef.current &&
        pdfDocumentRef.current &&
        !pdfDocumentRef.current.destroyed
      );
    }, []);

    // Fonction pour annuler le rendu en cours
    const cancelCurrentRender = useCallback(() => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          console.warn('Erreur annulation rendu:', e);
        }
        renderTaskRef.current = null;
      }
    }, []);

    // Fonction de rendu de page avec gestion des erreurs
    const computeFitScale = useCallback((baseViewport) => {
      const contentElement = viewerContentRef.current;
      if (!contentElement) return 1;

      const styles = window.getComputedStyle(contentElement);
      const paddingX = parseFloat(styles.paddingLeft || '0') + parseFloat(styles.paddingRight || '0');
      const paddingY = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');

      const availableWidth = Math.max(contentElement.clientWidth - paddingX, 50);
      const availableHeight = Math.max(contentElement.clientHeight - paddingY, 50);

      const widthRatio = availableWidth / baseViewport.width;
      const heightRatio = availableHeight / baseViewport.height;
      const fitScale = Math.min(widthRatio, heightRatio);

      if (!isFinite(fitScale) || fitScale <= 0) {
        return 1;
      }
      return fitScale;
    }, []);

    /**
     * Gère la navigation vers un lien interne du PDF
     * @param {Object|string|number} dest - Destination du lien (peut être un nom, un numéro de page, ou un objet de destination)
     */
    const handleInternalLink = useCallback(async (dest) => {
      // MODIFIÉ: Vérification du document valide
      if (!isDocumentValid()) return;

      try {
        let pageIndex;

        if (typeof dest === 'number') {
          // Destination directe par numéro de page (0-indexed)
          pageIndex = dest;
        } else if (typeof dest === 'string') {
          // Destination nommée - résoudre via le document
          // MODIFIÉ: Vérification avant l'opération asynchrone
          if (!isDocumentValid()) return;
          const destArray = await pdfDocumentRef.current.getDestination(dest);
          if (!isDocumentValid() || !destArray) return;
          
          const ref = destArray[0];
          pageIndex = await pdfDocumentRef.current.getPageIndex(ref);
        } else if (Array.isArray(dest)) {
          // Destination explicite [ref, type, ...]
          if (!isDocumentValid()) return;
          const ref = dest[0];
          pageIndex = await pdfDocumentRef.current.getPageIndex(ref);
        } else if (dest && typeof dest === 'object' && dest.num !== undefined) {
          // Référence directe à une page
          if (!isDocumentValid()) return;
          pageIndex = await pdfDocumentRef.current.getPageIndex(dest);
        }

        // Validation: s'assurer que pageIndex est un nombre valide
        if (isDocumentValid() && typeof pageIndex === 'number' && pageIndex >= 0 && pageIndex < numPages) {
          // PDF.js utilise des indices 0-based, notre state utilise 1-based
          setCurrentPage(pageIndex + 1);
        } else {
          console.warn('Destination de lien interne invalide ou hors limites');
        }
      } catch (error) {
        // MODIFIÉ: Ne logger que si ce n'est pas une erreur de transport destroyed
        if (error.message && !error.message.includes('Transport destroyed')) {
          console.warn('Erreur navigation lien interne:', error);
        }
      }
    }, [numPages, isDocumentValid]);

    /**
     * Gère le clic sur un lien externe - ouvre dans le navigateur par défaut
     * @param {string} url - URL à ouvrir
     */
    const handleExternalLink = useCallback((url) => {
      if (!url || typeof url !== 'string') return;
      
      // Utiliser l'API Electron pour ouvrir dans le navigateur par défaut
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url).catch((error) => {
          console.error('Erreur ouverture lien externe:', error);
        });
      } else {
        // Fallback pour les environnements sans Electron API
        console.warn('API Electron non disponible, impossible d\'ouvrir:', url);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }, []);

    /**
     * Nettoie les couches de texte et d'annotations
     */
    const clearLayers = useCallback(() => {
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
      }
      if (annotationLayerRef.current) {
        annotationLayerRef.current.innerHTML = '';
      }
    }, []);

    /**
     * Rend la couche de texte pour permettre la sélection
     * @param {Object} page - Page PDF.js
     * @param {Object} viewport - Viewport calculé
     */
    const renderTextLayer = useCallback(async (page, viewport) => {
      if (!textLayerRef.current || !isDocumentValid()) return;

      // Nettoyer la couche existante
      textLayerRef.current.innerHTML = '';

      try {
        // MODIFIÉ: Vérification avant opération asynchrone
        if (!isDocumentValid()) return;
        const textContent = await page.getTextContent();
        
        // MODIFIÉ: Vérification après opération asynchrone
        if (!isDocumentValid() || !textLayerRef.current) return;
        
        // Configurer les dimensions de la couche de texte
        textLayerRef.current.style.width = `${viewport.width}px`;
        textLayerRef.current.style.height = `${viewport.height}px`;

        // Utiliser la nouvelle API TextLayer de PDF.js
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerRef.current,
          viewport: viewport
        });

        await textLayer.render();
      } catch (error) {
        // MODIFIÉ: Ignorer les erreurs si le document est en cours de destruction
        if (error.name !== 'RenderingCancelledException' && isDocumentValid()) {
          if (!error.message || !error.message.includes('Transport destroyed')) {
            console.warn('Erreur rendu couche de texte:', error);
          }
        }
      }
    }, [pdfjsLib, isDocumentValid]);

    /**
     * Rend la couche d'annotations (liens, formulaires, etc.)
     * @param {Object} page - Page PDF.js
     * @param {Object} viewport - Viewport calculé
     */
    const renderAnnotationLayer = useCallback(async (page, viewport) => {
      if (!annotationLayerRef.current || !isDocumentValid()) return;

      // Nettoyer la couche existante
      annotationLayerRef.current.innerHTML = '';

      try {
        // MODIFIÉ: Vérification avant opération asynchrone
        if (!isDocumentValid()) return;
        const annotations = await page.getAnnotations({ intent: 'display' });
        
        // MODIFIÉ: Vérification après opération asynchrone
        if (!isDocumentValid() || !annotationLayerRef.current) return;
        
        if (!annotations || annotations.length === 0) {
          return;
        }

        // Configurer les dimensions de la couche d'annotations
        annotationLayerRef.current.style.width = `${viewport.width}px`;
        annotationLayerRef.current.style.height = `${viewport.height}px`;

        // Créer les éléments pour chaque annotation
        for (const annotation of annotations) {
          // Vérification continue pendant la boucle
          if (!isDocumentValid()) return;
          
          // Ne traiter que les annotations de type lien
          if (annotation.subtype !== 'Link') continue;

          const rect = annotation.rect;
          if (!rect || rect.length < 4) continue;

          // Transformer les coordonnées PDF en coordonnées écran
          const [x1, y1, x2, y2] = pdfjsLib.Util.normalizeRect(rect);
          
          // Appliquer la transformation du viewport
          const bounds = viewport.convertToViewportRectangle([x1, y1, x2, y2]);
          const left = Math.min(bounds[0], bounds[2]);
          const top = Math.min(bounds[1], bounds[3]);
          const width = Math.abs(bounds[2] - bounds[0]);
          const height = Math.abs(bounds[3] - bounds[1]);

          // Créer l'élément du lien
          const linkElement = document.createElement('a');
          linkElement.className = 'pdf-annotation pdf-annotation-link';
          linkElement.style.left = `${left}px`;
          linkElement.style.top = `${top}px`;
          linkElement.style.width = `${width}px`;
          linkElement.style.height = `${height}px`;

          // Déterminer le type de lien et ajouter le gestionnaire approprié
          if (annotation.url) {
            // Lien externe
            linkElement.href = annotation.url;
            linkElement.title = `Ouvrir: ${annotation.url}`;
            linkElement.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleExternalLink(annotation.url);
            });
          } else if (annotation.dest) {
            // Lien interne avec destination nommée ou explicite
            linkElement.href = '#';
            linkElement.title = 'Aller à la destination';
            linkElement.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleInternalLink(annotation.dest);
            });
          } else if (annotation.action) {
            // Action spéciale (GoTo, URI, etc.)
            const action = annotation.action;
            
            if (action.actionType === 'URI' && action.uri) {
              linkElement.href = action.uri;
              linkElement.title = `Ouvrir: ${action.uri}`;
              linkElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExternalLink(action.uri);
              });
            } else if (action.actionType === 'GoTo' && action.dest) {
              linkElement.href = '#';
              linkElement.title = 'Aller à la page';
              linkElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleInternalLink(action.dest);
              });
            } else if (action.actionType === 'GoToR') {
              // Lien vers un autre PDF - pour l'instant, juste afficher un message
              linkElement.href = '#';
              linkElement.title = 'Lien vers un autre document (non supporté)';
              linkElement.style.cursor = 'not-allowed';
              linkElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.warn('Liens vers d\'autres documents PDF non supportés');
              });
            }
          }

          annotationLayerRef.current.appendChild(linkElement);
        }
      } catch (error) {
        // MODIFIÉ: Ignorer les erreurs si le document est en cours de destruction
        if (isDocumentValid() && (!error.message || !error.message.includes('Transport destroyed'))) {
          console.warn('Erreur rendu couche d\'annotations:', error);
        }
      }
    }, [pdfjsLib, handleInternalLink, handleExternalLink, isDocumentValid]);

    const renderPage = useCallback(async (pageNum, scale = zoom) => {
      // MODIFIÉ: Vérification du document valide
      if (!isDocumentValid() || !canvasRef.current) return;

      cancelCurrentRender();
      clearLayers();

      try {
        // MODIFIÉ: Vérification avant opération asynchrone
        if (!isDocumentValid()) return;
        const page = await pdfDocumentRef.current.getPage(pageNum);
        
        // MODIFIÉ: Vérification après opération asynchrone
        if (!isDocumentValid() || !canvasRef.current) return;
        
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = computeFitScale(baseViewport);
        const targetScale = Math.max(0.1, fitScale * scale);
        const viewport = page.getViewport({ scale: targetScale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // MODIFIÉ: Vérification avant le rendu
        if (!isDocumentValid()) return;
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;

        // MODIFIÉ: Vérification après le rendu
        if (!isDocumentValid()) return;

        // Rendre les couches supplémentaires après le canvas
        // TextLayer pour la sélection de texte
        await renderTextLayer(page, viewport);
        
        // MODIFIÉ: Vérification entre les couches
        if (!isDocumentValid()) return;
        
        // AnnotationLayer pour les liens cliquables
        await renderAnnotationLayer(page, viewport);

      } catch (error) {
        if (error.name === 'RenderingCancelledException') {
          console.log('Rendu annulé (navigation rapide)');
        } else if (isDocumentValid() && (!error.message || !error.message.includes('Transport destroyed'))) {
          console.error('Erreur rendu page:', error);
        }
      }
    }, [zoom, cancelCurrentRender, clearLayers, computeFitScale, renderTextLayer, renderAnnotationLayer, isDocumentValid]);

    // Fonction pour traiter la file d'attente des rendus
    const processRenderQueue = useCallback(async () => {
      if (isRenderingRef.current || renderQueueRef.current.length === 0 || !isDocumentValid()) {
        return;
      }

      isRenderingRef.current = true;
      const { pageNum, scale, resolve } = renderQueueRef.current.shift();

      try {
        await renderPage(pageNum, scale);
        resolve();
      } catch (error) {
        if (isDocumentValid() && (!error.message || !error.message.includes('Transport destroyed'))) {
          console.error('Erreur lors du rendu de la page:', error);
        }
        resolve();
      } finally {
        isRenderingRef.current = false;
        setTimeout(processRenderQueue, 0);
      }
    }, [renderPage, isDocumentValid]);

    // Fonction pour ajouter une tâche de rendu à la file
    const queueRender = useCallback((pageNum, scale) => {
      return new Promise((resolve) => {
        renderQueueRef.current.push({ pageNum, scale, resolve });
        processRenderQueue();
      });
    }, [processRenderQueue]);

    // Fonction pour générer une miniature et la sauvegarder sur disque
    // INV-03: Miniatures générées uniquement pour pages bookmarkées
    const generateAndSaveThumbnail = useCallback(async (pageNum) => {
      // MODIFIÉ: Vérification du document valide
      if (!isDocumentValid()) return null;

      try {
        // MODIFIÉ: Vérification avant opération asynchrone
        if (!isDocumentValid()) return null;
        const page = await pdfDocumentRef.current.getPage(pageNum);
        
        // MODIFIÉ: Vérification après opération asynchrone
        if (!isDocumentValid()) return null;
        
        const baseViewport = page.getViewport({ scale: 1 });

        // Calculer un scale HD (jusqu'à 2K) en tenant compte du devicePixelRatio
        const dpr = (window.devicePixelRatio || 1) * 1.5;
        const TARGET_WIDTH = 2000 * dpr;
        const TARGET_HEIGHT = 2400 * dpr;
        const scale = Math.min(
          TARGET_WIDTH / baseViewport.width,
          TARGET_HEIGHT / baseViewport.height
        );
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        // MODIFIÉ: Vérification avant le rendu
        if (!isDocumentValid()) return null;
        await page.render(renderContext).promise;
        
        // MODIFIÉ: Vérification après le rendu
        if (!isDocumentValid()) return null;

        // Convertir en data URL pour envoi au main process
        const imageData = canvas.toDataURL('image/png');
        
        // Sauvegarder via l'API Electron qui retournera le chemin du fichier
        const result = await window.electronAPI.generateThumbnail(
          pdfData.path,
          pageNum,
          imageData
        );
        
        if (result.success) {
          return result.thumbnailPath;
        } else {
          console.error('Erreur sauvegarde miniature:', result.error);
          return null;
        }
      } catch (error) {
        // MODIFIÉ: Ignorer les erreurs si le document est en cours de destruction
        if (isDocumentValid() && (!error.message || !error.message.includes('Transport destroyed'))) {
          console.error('Erreur génération miniature:', error);
        }
        return null;
      }
    }, [pdfData?.path, isDocumentValid]);

    // Callback pour ajouter un bookmark
    // R2: Miniature obligatoire
    // R3: Persistance automatique
    // INV-02: Titre non-vide (défaut "Page X")
    const handleAddBookmark = useCallback(async () => {
      // MODIFIÉ: Vérification du document valide
      if (isAddingBookmark || !isDocumentValid() || !currentPage || currentPage < 1 || currentPage > numPages) {
        console.warn('Impossible d\'ajouter un bookmark : PDF non chargé ou page invalide.');
        return;
      }

      setIsAddingBookmark(true);
      
      try {
        // 1. Ajouter le bookmark immédiatement avec titre par défaut
        const title = `Page ${currentPage}`;
        const addResult = await window.electronAPI.addBookmark(pdfData.path, currentPage, title);
        
        if (!addResult.success) {
          console.error(addResult.error || 'Erreur ajout bookmark');
          setIsAddingBookmark(false);
          return;
        }
        
        // 2. Mettre à jour l'état local immédiatement
        setBookmarks(addResult.bookmarks);
        
        // 3. Générer la miniature de manière asynchrone
        // R2: Miniature obligatoire - on la génère après l'ajout
        const thumbnailPath = await generateAndSaveThumbnail(currentPage);
        
        if (thumbnailPath) {
          // 4. Mettre à jour le bookmark avec le chemin de la miniature
          const updateResult = await window.electronAPI.updateBookmark(
            pdfData.path,
            addResult.bookmark.id,
            { thumbnailPath }
);
          
          if (updateResult.success) {
            setBookmarks(updateResult.bookmarks);
          }
        } else {
          console.warn('Bookmark ajouté mais miniature non générée');
        }
        
      } catch (error) {
        console.error('Erreur ajout bookmark:', error);
      } finally {
        setIsAddingBookmark(false);
      }
    }, [currentPage, numPages, pdfData.path, generateAndSaveThumbnail, isAddingBookmark, isDocumentValid]);

    // Callback pour naviguer vers un bookmark
    const handleNavigateToBookmark = useCallback((bookmark) => {
      if (bookmark.page >= 1 && bookmark.page <= numPages) {
        setCurrentPage(bookmark.page);
      } else {
        console.warn('Page invalide pour le bookmark sélectionné');
      }
    }, [numPages]);

    // Callback pour preview un bookmark
    const handlePreviewBookmark = useCallback((bookmark) => {
      setPreviewBookmark(bookmark);
    }, []);

    // Callback pour fermer la preview
    const handleClosePreview = useCallback(() => {
      setPreviewBookmark(null);
    }, []);

    // Callback pour mettre à jour un bookmark
    // INV-02: Titre non-vide
    const handleUpdateBookmark = useCallback(async (bookmarkId, updates) => {
      try {
        // Validation côté client pour INV-02
        if (updates.title !== undefined && (!updates.title || !updates.title.trim())) {
          console.warn('Le titre du bookmark ne peut pas être vide');
          return;
        }
        
        const result = await window.electronAPI.updateBookmark(pdfData.path, bookmarkId, updates);
        if (result.success) {
          setBookmarks(result.bookmarks);
        } else {
          console.error(result.error || 'Erreur mise à jour bookmark');
        }
      } catch (error) {
        console.error('Erreur mise à jour bookmark:', error);
      }
    }, [pdfData.path]);

    // Callback pour supprimer un bookmark
    const handleDeleteBookmark = useCallback(async (bookmarkId) => {
      if (!confirm('Supprimer ce bookmark ?')) return;
      
      try {
        const result = await window.electronAPI.deleteBookmark(pdfData.path, bookmarkId);
        if (result.success) {
          setBookmarks(result.bookmarks);
        } else {
          console.error(result.error || 'Erreur suppression bookmark');
        }
      } catch (error) {
        console.error('Erreur suppression bookmark:', error);
      }
    }, [pdfData.path]);

    // Callback pour réorganiser les bookmarks
    // R6: Ordre réorganisable par l'utilisateur
    const handleReorderBookmarks = useCallback(async (bookmarkIds) => {
      try {
        const result = await window.electronAPI.reorderBookmarks(pdfData.path, bookmarkIds);
        if (result.success) {
          setBookmarks(result.bookmarks);
        } else {
          console.error(result.error || 'Erreur réorganisation bookmarks');
        }
      } catch (error) {
        console.error('Erreur réorganisation bookmarks:', error);
      }
    }, [pdfData.path]);

    // NOUVEAU: Fonction de nettoyage sécurisée du document PDF
    const cleanupPdfDocument = useCallback(async () => {
      // Marquer comme en cours de destruction
      isDestroyingRef.current = true;

      // Annuler le rendu en cours
      cancelCurrentRender();
      
      // Vider la queue de rendu
      renderQueueRef.current = [];
      
      // Nettoyer les couches
      clearLayers();

      // Attendre un court instant pour que les opérations asynchrones en cours se terminent
      await new Promise(resolve => setTimeout(resolve, 50));

      // Détruire le document PDF s'il existe
      if (pdfDocumentRef.current) {
        try {
          await pdfDocumentRef.current.destroy();
        } catch (error) {
          // Ignorer les erreurs de destruction
          console.warn('Erreur lors de la destruction du document PDF:', error);
        }
        pdfDocumentRef.current = null;
      }

      // Réinitialiser le flag de destruction
      isDestroyingRef.current = false;
    }, [cancelCurrentRender, clearLayers]);

    // Fonction de chargement du PDF
    const loadPdf = useCallback(async () => {
      if (!pdfData || !isMountedRef.current) return;

      // NOUVEAU: Nettoyer le document précédent avant de charger le nouveau
      if (pdfDocumentRef.current) {
        await cleanupPdfDocument();
      }

      try {
        setIsLoading(true);
        
        // NOUVEAU: Créer un nouveau AbortController
        abortControllerRef.current = new AbortController();
        
        const pdfDataUint8 = new Uint8Array(pdfData.data);
        const loadingTask = pdfjsLib.getDocument({ data: pdfDataUint8 });
        const pdf = await loadingTask.promise;
        
        if (!isMountedRef.current || isDestroyingRef.current) {
          // Si le composant est démonté pendant le chargement, nettoyer
          await pdf.destroy();
          return;
        }
        
        pdfDocumentRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        
        // Charger les bookmarks depuis pdfData
        setBookmarks(pdfData.bookmarks || []);
        
        await queueRender(1, zoom);
        setIsLoading(false);
      } catch (err) {
        if (!isMountedRef.current || isDestroyingRef.current) return;
        console.error('Erreur chargement PDF:', err);
        setIsLoading(false);
      }
    }, [pdfData, zoom, queueRender, pdfjsLib, cleanupPdfDocument]);

    // Effet pour charger le PDF au montage
    useEffect(() => {
      if (pdfData) {
        loadPdf();
      }
      
      return () => {
        // MODIFIÉ: Utiliser la fonction de nettoyage sécurisée
        cleanupPdfDocument();
      };
    }, [pdfData, loadPdf, cleanupPdfDocument]);

    // Effet pour gérer le changement de page ou de zoom
    useEffect(() => {
      if (isDocumentValid() && currentPage >= 1 && currentPage <= numPages) {
        queueRender(currentPage, zoom);
      }
    }, [currentPage, zoom, numPages, queueRender, isDocumentValid]);

    useEffect(() => {
      viewStateRef.current = { page: currentPage, zoom };
    }, [currentPage, zoom]);

    // Effet pour gérer le cycle de vie du composant
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        cancelCurrentRender();
      };
    }, [cancelCurrentRender]);

    useEffect(() => {
      if (typeof ResizeObserver === 'undefined') {
        const handleResize = () => {
          if (!isDocumentValid()) return;
          const { page, zoom: zoomLevel } = viewStateRef.current;
          queueRender(page, zoomLevel);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }

      const contentEl = viewerContentRef.current;
      if (!contentEl) return undefined;

      const observer = new ResizeObserver(() => {
        if (!isDocumentValid()) return;
        const { page, zoom: zoomLevel } = viewStateRef.current;
        queueRender(page, zoomLevel);
      });

      observer.observe(contentEl);
      return () => observer.disconnect();
    }, [queueRender, viewerContentEl, isDocumentValid]);

    // === RACCOURCIS CLAVIER ===
    useEffect(() => {
      const handleKeyDown = (event) => {
        // Ignorer si on est dans un input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
          return;
        }

        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case '=':
            case '+':
              event.preventDefault();
              setZoom(prev => Math.min(prev + 0.1, 3.0));
              break;
            case '-':
              event.preventDefault();
              setZoom(prev => Math.max(prev - 0.1, 0.5));
              break;
            case 'b':
              event.preventDefault();
              handleAddBookmark();
              break;
            case 'h':
              event.preventDefault();
              onGoHome();
              break;
            default:
              break;
          }
        } else {
          switch (event.key) {
            case 'ArrowLeft':
              event.preventDefault();
              if (currentPage > 1) setCurrentPage(prev => prev - 1);
              break;
            case 'ArrowRight':
              event.preventDefault();
              if (currentPage < numPages) setCurrentPage(prev => prev + 1);
              break;
            case 'Home':
              event.preventDefault();
              setCurrentPage(1);
              break;
            case 'End':
              event.preventDefault();
              setCurrentPage(numPages);
              break;
            case 'Escape':
              event.preventDefault();
              if (previewBookmark) {
                handleClosePreview();
              }
              break;
            default:
              break;
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, numPages, onGoHome, handleAddBookmark, previewBookmark, handleClosePreview]);

    // === COPIE AUTOMATIQUE DU TEXTE SÉLECTIONNÉ ===
    useEffect(() => {
      const handleSelectionEnd = (event) => {
        try {
          // Si c'est un événement clavier, filtrer les touches de raccourci
          if (event.type === 'keyup') {
            // Ignorer les touches qui ne sont pas liées à la sélection
            const isSelectionKey = (
              event.key.startsWith('Arrow') ||
              event.key === 'Shift' ||
              event.key === 'Control' ||
              event.key === 'Meta' ||
              (event.key === 'a' && (event.ctrlKey || event.metaKey)) // Ctrl+A
            );
            
            // Ignorer les raccourcis applicatifs (navigation, zoom, etc.)
            if (!isSelectionKey) {
              return;
            }
          }

          const selection = document.getSelection();
          
          // Vérifier qu'il y a une sélection avec du texte
          if (!selection || selection.isCollapsed) {
            return;
          }

          const selectedText = selection.toString().trim();
          
          // Ne rien faire si le texte est vide
          if (!selectedText) {
            return;
          }

          // Vérifier que la sélection est dans le conteneur du PDF
          if (!containerRef.current) {
            return;
          }

          // Vérifier que l'anchorNode ou le focusNode est dans le conteneur PDF
          const anchorNode = selection.anchorNode;
          const focusNode = selection.focusNode;
          
          const isInContainer = (
            (anchorNode && containerRef.current.contains(anchorNode)) ||
            (focusNode && containerRef.current.contains(focusNode))
          );

          if (!isInContainer) {
            return;
          }

          // Copier dans le presse-papier
          navigator.clipboard.writeText(selectedText)
            .catch((error) => {
              // Gestion silencieuse des erreurs (permissions, etc.)
              console.warn('Impossible de copier dans le presse-papier:', error.message || error);
            });

        } catch (error) {
          // Gestion silencieuse des erreurs inattendues
          console.warn('Erreur lors de la copie de sélection:', error.message || error);
        }
      };

      // Écouter mouseup (fin de sélection souris) et keyup (fin de sélection clavier)
      document.addEventListener('mouseup', handleSelectionEnd);
      document.addEventListener('keyup', handleSelectionEnd);

      // Cleanup
      return () => {
        document.removeEventListener('mouseup', handleSelectionEnd);
        document.removeEventListener('keyup', handleSelectionEnd);
      };
    }, []); // Pas de dépendances - containerRef est stable (useRef)

    // === RENDU ===
    return React.createElement('div', { className: 'pdf-viewer', ref: containerRef },
      // Header (toolbar)
      React.createElement('div', { className: 'viewer-header' },
        React.createElement('div', { className: 'viewer-nav' },
          React.createElement('button', {
            className: 'btn-secondary back-btn',
            onClick: onGoHome,
            title: 'Retour à l\'accueil (Ctrl+H)'
          }, '🏠 Accueil'),
          React.createElement('button', {
            className: 'btn-icon',
            onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
            disabled: currentPage === 1,
            title: 'Page précédente (←)'
          }, '◀'),
          React.createElement('div', { className: 'page-indicator' },
            React.createElement('span', { className: 'page-info' }, 'Page ' + currentPage + ' / ' + numPages),
            React.createElement('input', {
              type: 'number',
              min: 1,
              max: numPages,
              value: currentPage,
              onChange: (e) => {
                const page = parseInt(e.target.value, 10);
                if (page >= 1 && page <= numPages) {
                  setCurrentPage(page);
                }
              },
              className: 'page-input',
              title: 'Aller à la page'
            })
          ),
          React.createElement('button', {
            className: 'btn-icon',
            onClick: () => setCurrentPage(prev => Math.min(prev + 1, numPages)),
            disabled: currentPage === numPages,
            title: 'Page suivante (→)'
          }, '▶')
        ),
        React.createElement('div', { className: 'viewer-actions' },
          React.createElement('button', {
            className: 'btn-primary',
            onClick: handleAddBookmark,
            disabled: isAddingBookmark,
            title: 'Ajouter un bookmark (Ctrl+B)'
          }, isAddingBookmark ? '⏳ Ajout...' : '🔖 Bookmark')
        ),
        React.createElement('div', { className: 'viewer-zoom' },
          React.createElement('button', {
            className: 'btn-icon',
            onClick: () => setZoom(prev => Math.max(prev - 0.1, 0.5)),
            title: 'Zoom arrière (Ctrl+-)'
          }, '➖'),
          React.createElement('span', { className: 'zoom-percent' }, `${Math.round(zoom * 100)}%`),
          React.createElement('button', {
            className: 'btn-icon',
            onClick: () => setZoom(prev => Math.min(prev + 0.1, 3.0)),
            title: 'Zoom avant (Ctrl++)'
          }, '➕'),
          React.createElement('button', {
            className: 'btn-secondary btn-small',
            onClick: () => setZoom(1.0),
            title: 'Réinitialiser le zoom'
          }, '100%')
        )
      ),
      React.createElement('div', { className: 'viewer-content', ref: attachViewerContentRef },
        isLoading ? React.createElement('div', { className: 'loading-overlay' },
          React.createElement('div', { className: 'spinner' }),
          React.createElement('p', null, 'Chargement du PDF...')
        ) : null,
        React.createElement('div', { className: 'pdf-canvas-container' },
          React.createElement('canvas', { ref: canvasRef, id: 'pdf-canvas' }),
          React.createElement('div', { 
            ref: textLayerRef, 
            className: 'pdf-text-layer',
            draggable: false,
            onDragStart: (e) => e.preventDefault()
          }),
          React.createElement('div', { 
            ref: annotationLayerRef, 
            className: 'pdf-annotation-layer' 
          })
        )
      ),
      // Section bookmarks
      React.createElement(window.BookmarkList, {
        bookmarks: bookmarks,
        onNavigate: handleNavigateToBookmark,
        onPreview: handlePreviewBookmark,
        onUpdate: handleUpdateBookmark,
        onDelete: handleDeleteBookmark,
        onReorder: handleReorderBookmarks
      }      ),
      // Modal de preview
      previewBookmark && React.createElement('div', {
        className: 'preview-overlay',
        onClick: handleClosePreview
      },
        React.createElement('div', {
          className: 'preview-modal',
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('div', { className: 'preview-header' },
            React.createElement('h3', null, previewBookmark.title),
            React.createElement('button', {
              className: 'btn-secondary btn-icon btn-small',
              onClick: handleClosePreview,
              title: 'Fermer (Esc)'
            }, '✕')
          ),
          React.createElement('div', { className: 'preview-body' },
            previewBookmark.thumbnailPath
              ? React.createElement('img', {
                  src: `file://${previewBookmark.thumbnailPath}`,
                  alt: 'Aperçu ' + previewBookmark.title,
                  className: 'preview-image',
                  onError: (e) => {
                    console.error('Erreur chargement miniature:', previewBookmark.thumbnailPath);
                    e.target.style.display = 'none';
                  }
                })
              : React.createElement('div', { className: 'preview-placeholder' },
                  `Aperçu non disponible pour ${previewBookmark.title}`
                )
          ),
          React.createElement('div', { className: 'preview-footer' },
            React.createElement('div', { className: 'preview-actions' },
              React.createElement('button', {
                className: 'btn-primary preview-action-btn',
                onClick: () => {
                  handleNavigateToBookmark(previewBookmark);
                  handleClosePreview();
                }
              }, 'Afficher cette page'),
              React.createElement('button', {
                className: 'btn-secondary preview-action-btn',
                onClick: handleClosePreview
              }, 'Fermer')
            )
          )
        )
      ),
    );
  }

  // Exposer globalement
  window.PdfViewer = PdfViewer;
})();