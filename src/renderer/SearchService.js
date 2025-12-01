/**
 * SearchService.js - Service de recherche textuelle dans les PDFs
 * Utilise PDF.js pour extraire le texte et effectuer des recherches
 * Supporte la recherche insensible à la casse avec correspondances partielles
 * 
 * ARCHITECTURE: Le texte est construit en concaténant les items.str sans modification.
 * Les itemOffsets permettent de mapper les positions de recherche vers les spans du TextLayer.
 * 
 * SYNCHRONISATION TextLayer: PDF.js crée un span par item avec item.str comme textContent.
 * Nous NE devons PAS ajouter d'espaces supplémentaires (hasEOL ou autres) car ils n'existent
 * pas dans le DOM du TextLayer. Cela garantit que les index de recherche correspondent
 * exactement aux positions dans les spans.
 * 
 * FILTRAGE ITEMS VIDES: PDF.js peut ignorer les items vides (str === '') lors de la génération
 * du TextLayer. Nous devons également les filtrer pour maintenir la synchronisation.
 */

(function() {
  class SearchService {
    constructor() {
      this.abortController = null;
    }

    /**
     * Effectue une recherche dans le document PDF
     * @param {string} query - Terme de recherche
     * @param {Object} pdfDocument - Document PDF.js
     * @param {Function} onProgress - Callback de progression (page courante, total)
     * @returns {Promise<Array>} - Liste des résultats de recherche groupés par page avec correspondances
     */
    async search(query, pdfDocument, onProgress = null) {
      if (!query || !query.trim()) {
        throw new Error('Terme de recherche requis');
      }

      if (!pdfDocument) {
        throw new Error('Document PDF non valide');
      }

      // Annuler la recherche précédente si elle existe
      this.cancel();

      this.abortController = new AbortController();

      const trimmedQuery = query.trim();
      const results = {};
      const numPages = pdfDocument.numPages;

      try {
        // Extraire le texte de toutes les pages
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (this.abortController.signal.aborted) {
            break;
          }

          onProgress && onProgress(pageNum, numPages);

          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();

          const { count, matches } = this._findMatchesInPage(textContent, trimmedQuery);
          if (count > 0) {
            results[pageNum] = { count, matches };
          }
        }

        // Convertir en tableau et trier par page
        const groupedResults = Object.entries(results)
          .map(([page, data]) => ({ page: parseInt(page), count: data.count, matches: data.matches }))
          .sort((a, b) => a.page - b.page);

        return groupedResults;
      } catch (error) {
        if (error.name === 'AbortError') {
          return [];
        }
        throw error;
      }
    }

    /**
     * Filtre les items vides du textContent.
     * 
     * IMPORTANT: PDF.js peut ignorer les items avec str === '' lors de la génération du TextLayer.
     * Nous devons filtrer ces items pour maintenir la synchronisation entre nos offsets
     * et les spans générés par PDF.js.
     * 
     * @param {Array} items - Liste des items de textContent
     * @returns {Array} - Items filtrés (sans items vides)
     */
    _filterItems(items) {
      return items.filter(item => item.str !== '');
    }

    /**
     * Construit le texte complet d'une page en concaténant simplement les items non-vides.
     * 
     * IMPORTANT: Cette méthode doit produire un texte dont les index correspondent
     * exactement aux positions dans les spans du TextLayer.
     * 
     * PDF.js TextLayer crée un span par item de textContent.items (items non-vides uniquement).
     * Chaque span contient exactement item.str (sans modification).
     * 
     * Nous ne devons PAS ajouter d'espaces supplémentaires car ils n'existent
     * pas dans le DOM du TextLayer.
     * 
     * NOTE: Les items sont concaténés sans espaces. Dans les PDFs bien formés,
     * les espaces sont inclus dans item.str. Pour les PDFs avec texte fragmenté,
     * accepter que certains mots puissent être collés est un compromis pour
     * maintenir la synchronisation exacte avec le TextLayer.
     * 
     * @param {Object} textContent - Contenu texte de la page (textContent.items)
     * @returns {{fullText: string, itemOffsets: Array}} - Le texte et les offsets par item
     */
    _buildTextAndOffsets(textContent) {
      // NOUVEAU: Filtrer les items vides pour synchronisation avec PDF.js TextLayer
      const filteredItems = this._filterItems(textContent.items);
      
      let fullText = '';
      const itemOffsets = [];

      for (let i = 0; i < filteredItems.length; i++) {
        const item = filteredItems[i];
        const str = item.str || ''; // Sécurité supplémentaire, normalement déjà filtré
        
        const start = fullText.length;
        fullText += str;
        const end = fullText.length;
        
        itemOffsets.push({ start, end, length: str.length });
      }

      return { fullText, itemOffsets };
    }

    /**
     * Trouve les correspondances dans le texte d'une page.
     * Retourne les matches avec leurs index dans le texte concaténé.
     * 
     * @param {Object} textContent - Contenu texte de la page
     * @param {string} query - Terme de recherche
     * @returns {Object} - {count: number, matches: Array<{text: string, index: number}>}
     */
    _findMatchesInPage(textContent, query) {
      // Construire le texte sans espaces supplémentaires (items filtrés)
      const { fullText } = this._buildTextAndOffsets(textContent);

      // Recherche insensible à la casse
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let count = 0;
      const matches = [];
      let match;

      while ((match = regex.exec(fullText)) !== null) {
        count++;
        matches.push({
          text: match[0],
          index: match.index
        });

        // Éviter les boucles infinies avec des correspondances vides
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      return { count, matches };
    }

    /**
     * Annule la recherche en cours
     */
    cancel() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }
  }

  // Instance globale
  window.SearchService = new SearchService();
})();