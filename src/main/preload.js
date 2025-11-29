/**
 * Preload script - API sécurisée pour le renderer
 * Expose uniquement les fonctions nécessaires via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// Définition des canaux IPC autorisés (whitelist)
const ALLOWED_CHANNELS = [
  'pdf:open-dialog',
  'pdf:load',
  'pdf:get-recent',
  'pdf:remove-recent',
  'pdf-forget',
  'pdf:delete',
  'pdf:verify',
  'bookmark:add',
  'bookmark:update',
  'bookmark:delete',
  'bookmark:reorder',
  'bookmark:get-all',
  'thumbnail:generate',
  'thumbnail:get',
  'shell:open-external',
  'config:get',
  'config:save',
  'error',
  'notification'
];

/**
 * Vérifie si un canal est autorisé
 * @param {string} channel - Nom du canal
 * @returns {boolean}
 */
function isValidChannel(channel) {
  return ALLOWED_CHANNELS.includes(channel);
}

/**
 * API exposée au processus renderer
 * Sécurisée via contextBridge
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // GESTION DES PDFs
  // ============================================
  
  /**
   * Ouvre le dialogue de sélection de fichier PDF
   * @returns {Promise<string|null>} - Chemin du fichier ou null si annulé
   */
  openPdfDialog: () => ipcRenderer.invoke('pdf:open-dialog'),

  /**
   * Charge un fichier PDF
   * @param {string} filePath - Chemin du fichier PDF
   * @returns {Promise<Object>} - Données du PDF et métadonnées
   */
  loadPdf: (filePath) => {
    if (typeof filePath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('pdf:load', filePath);
  },

  /**
   * Récupère la liste des PDFs récemment ouverts
   * @returns {Promise<Object>} - Liste des PDFs récents
   */
  getRecentPdfs: () => ipcRenderer.invoke('pdf:get-recent'),

  /**
   * Supprime un PDF de l'historique récent
   * @param {string} filePath - Chemin du fichier PDF
   * @returns {Promise<Object>}
   */
  removeRecentPdf: (filePath) => {
    if (typeof filePath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('pdf:remove-recent', filePath);
  },

  /**
   * Oublie un PDF : supprime toutes les données mais laisse le fichier intact
   * @param {string} filePath - Chemin du fichier PDF
   * @returns {Promise<Object>}
   */
  forgetPdf: (filePath) => {
    if (typeof filePath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('pdf:forget', filePath);
  },

  /**
   * Supprime un PDF du disque et toutes ses données
   * @param {string} filePath - Chemin du fichier PDF
   * @returns {Promise<Object>}
   */
  deletePdf: (filePath) => {
    if (typeof filePath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('pdf:delete', filePath);
  },

  /**
   * Vérifie l'intégrité d'un PDF
   * @param {string} filePath - Chemin du fichier PDF
   * @returns {Promise<Object>}
   */
  verifyPdf: (filePath) => {
    if (typeof filePath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('pdf:verify', filePath);
  },

  // ============================================
  // GESTION DES BOOKMARKS
  // ============================================

  /**
   * Ajoute un bookmark
   * @param {string} pdfPath - Chemin du PDF
   * @param {number} page - Numéro de page
   * @param {string} [title] - Titre du bookmark (optionnel)
   * @returns {Promise<Object>}
   */
  addBookmark: (pdfPath, page, title) => {
    if (typeof pdfPath !== 'string' || typeof page !== 'number') {
      return Promise.reject(new Error('Paramètres invalides'));
    }
    return ipcRenderer.invoke('bookmark:add', { pdfPath, page, title });
  },

  /**
   * Met à jour un bookmark
   * @param {string} pdfPath - Chemin du PDF
   * @param {string} bookmarkId - ID du bookmark
   * @param {Object} updates - Champs à mettre à jour
   * @returns {Promise<Object>}
   */
  updateBookmark: (pdfPath, bookmarkId, updates) => {
    if (typeof pdfPath !== 'string' || typeof bookmarkId !== 'string') {
      return Promise.reject(new Error('Paramètres invalides'));
    }
    return ipcRenderer.invoke('bookmark:update', { pdfPath, bookmarkId, updates });
  },

  /**
   * Supprime un bookmark
   * @param {string} pdfPath - Chemin du PDF
   * @param {string} bookmarkId - ID du bookmark
   * @returns {Promise<Object>}
   */
  deleteBookmark: (pdfPath, bookmarkId) => {
    if (typeof pdfPath !== 'string' || typeof bookmarkId !== 'string') {
      return Promise.reject(new Error('Paramètres invalides'));
    }
    return ipcRenderer.invoke('bookmark:delete', { pdfPath, bookmarkId });
  },

  /**
   * Réorganise les bookmarks
   * @param {string} pdfPath - Chemin du PDF
   * @param {string[]} bookmarkIds - Nouvel ordre des IDs
   * @returns {Promise<Object>}
   */
  reorderBookmarks: (pdfPath, bookmarkIds) => {
    if (typeof pdfPath !== 'string' || !Array.isArray(bookmarkIds)) {
      return Promise.reject(new Error('Paramètres invalides'));
    }
    return ipcRenderer.invoke('bookmark:reorder', { pdfPath, bookmarkIds });
  },

  /**
   * Récupère tous les bookmarks d'un PDF
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<Object>}
   */
  getBookmarks: (pdfPath) => {
    if (typeof pdfPath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('bookmark:get-all', pdfPath);
  },

  // ============================================
  // GESTION DES MINIATURES
  // ============================================

  /**
   * Génère une miniature pour une page
   * @param {string} pdfPath - Chemin du PDF
   * @param {number} pageNum - Numéro de page
   * @param {string} imageData - Données image en data URL
   * @returns {Promise<Object>}
   */
  generateThumbnail: (pdfPath, pageNum, imageData) => {
    if (typeof pdfPath !== 'string' || typeof pageNum !== 'number') {
      return Promise.reject(new Error('Paramètres invalides'));
    }
    return ipcRenderer.invoke('thumbnail:generate', { pdfPath, pageNum, imageData });
  },

  /**
   * Récupère une miniature existante
   * @param {string} thumbnailPath - Chemin de la miniature
   * @returns {Promise<Object>}
   */
  getThumbnail: (thumbnailPath) => {
    if (typeof thumbnailPath !== 'string') {
      return Promise.reject(new Error('Chemin invalide'));
    }
    return ipcRenderer.invoke('thumbnail:get', thumbnailPath);
  },

  // ============================================
  // SHELL - LIENS EXTERNES
  // ============================================

  /**
   * Ouvre une URL dans le navigateur par défaut
   * @param {string} url - URL à ouvrir
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  openExternal: (url) => {
    if (typeof url !== 'string' || !url.trim()) {
      return Promise.reject(new Error('URL invalide'));
    }
    // Validation basique de l'URL
    try {
      new URL(url);
    } catch {
      return Promise.reject(new Error('URL malformée'));
    }
    return ipcRenderer.invoke('shell:open-external', url);
  },

  // ============================================
  // ÉVÉNEMENTS
  // ============================================

  /**
   * Écoute les événements du processus main
   * @param {string} channel - Nom du canal
   * @param {Function} callback - Fonction de rappel
   * @returns {Function} - Fonction pour se désabonner
   */
  on: (channel, callback) => {
    if (!isValidChannel(channel)) {
      console.warn(`Canal non autorisé: ${channel}`);
      return () => {};
    }

    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  }
});