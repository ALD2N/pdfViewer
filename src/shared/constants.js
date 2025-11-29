/**
 * Constantes partagées pour l'application PDF Viewer
 * Utilisées par le processus main et renderer via IPC
 */

const IPC_CHANNELS = {
  // Gestion des fichiers PDF
  PDF_OPEN_DIALOG: 'pdf:open-dialog',
  PDF_LOAD: 'pdf:load',
  PDF_GET_RECENT: 'pdf:get-recent',
  PDF_REMOVE_RECENT: 'pdf:remove-recent',
  PDF_FORGET: 'pdf:forget',
  PDF_DELETE: 'pdf:delete',
  PDF_VERIFY: 'pdf:verify',

  // Gestion des bookmarks
  BOOKMARK_ADD: 'bookmark:add',
  BOOKMARK_UPDATE: 'bookmark:update',
  BOOKMARK_DELETE: 'bookmark:delete',
  BOOKMARK_REORDER: 'bookmark:reorder',
  BOOKMARK_GET_ALL: 'bookmark:get-all',

  // Gestion des miniatures
  THUMBNAIL_GENERATE: 'thumbnail:generate',
  THUMBNAIL_GET: 'thumbnail:get',

  // Shell - liens externes
  SHELL_OPEN_EXTERNAL: 'shell:open-external',

  // Configuration
  CONFIG_GET: 'config:get',
  CONFIG_SAVE: 'config:save',

  // Erreurs et notifications
  ERROR: 'error',
  NOTIFICATION: 'notification'
};

const CONFIG = {
  APP_NAME: 'pdf-viewer',
  CONFIG_FILE: 'config.json',
  THUMBNAILS_DIR: 'thumbnails',
  THUMBNAIL_WIDTH: 150,
  THUMBNAIL_HEIGHT: 200,
  THUMBNAIL_QUALITY: 0.8,
  MAX_RECENT_PDFS: 20,
  CONFIG_VERSION: '1.0'
};

const DEFAULT_CONFIG = {
  version: CONFIG.CONFIG_VERSION,
  recentPdfs: [],
  bookmarks: {}
};

// Export pour usage dans Node.js (main process) - CommonJS
// Utilisation d'un try-catch pour gérer les environnements Jest/jsdom atypiques
// où module peut exister mais module.exports être dans un état inconsistant
try {
  if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = { IPC_CHANNELS, CONFIG, DEFAULT_CONFIG };
  }
} catch (error) {
  // Ignorer silencieusement les erreurs d'export dans les environnements non-CommonJS
  // Cela permet au fichier de fonctionner dans Jest avec testEnvironment: "jsdom"
}

// Export pour usage dans le renderer (si bundler utilisé ou navigateur)
if (typeof window !== 'undefined') {
  window.AppConstants = { IPC_CHANNELS, CONFIG, DEFAULT_CONFIG };
}