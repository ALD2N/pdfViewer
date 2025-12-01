/**
 * Service de persistance - Gestion du fichier JSON de configuration
 * Implémente le Repository Pattern pour abstraire la persistance
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { CONFIG, DEFAULT_CONFIG } = require('../shared/constants.js');

class PersistenceService {
  /**
   * @param {string} configDir - Dossier de configuration
   */
  constructor(configDir) {
    this.configDir = configDir;
    this.configPath = path.join(configDir, CONFIG.CONFIG_FILE);
    this.backupPath = path.join(configDir, `${CONFIG.CONFIG_FILE}.backup`);
    this.config = null;
    this.saveTimeout = null;
    this.isDirty = false;
  }

  /**
   * Initialise le service et charge la configuration
   */
  async init() {
    await fs.ensureDir(this.configDir);
    await this.loadConfig();
  }

  /**
   * Charge la configuration depuis le fichier JSON
   * RE2: Gestion de la corruption du fichier JSON
   * @returns {Promise<Object>}
   */
  async loadConfig() {
    console.log('[DEBUG] PersistenceService.loadConfig: Starting to load config from', this.configPath);
    console.log('[DEBUG] PersistenceService.loadConfig: Starting to load config from', this.configPath);
    try {
      const exists = await fs.pathExists(this.configPath);
      
      if (!exists) {
        // Créer une configuration par défaut
        this.config = { ...DEFAULT_CONFIG };
        console.log('[DEBUG] PersistenceService.loadConfig: Config file does not exist, creating default config');
        await this.saveConfig();
        return this.config;
      }

      const data = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(data);
      console.log('[DEBUG] PersistenceService.loadConfig: Config loaded successfully, version:', this.config.version);

      // Valider et migrer si nécessaire
      this.config = this.validateAndMigrate(this.config);
      
      return this.config;
    } catch (error) {
      console.error('Erreur lecture config, tentative de restauration:', error);
      
      // Tenter de restaurer depuis le backup
      try {
        const backupExists = await fs.pathExists(this.backupPath);
        if (backupExists) {
          const backupData = await fs.readFile(this.backupPath, 'utf8');
          this.config = JSON.parse(backupData);
          this.config = this.validateAndMigrate(this.config);
          console.log('[DEBUG] PersistenceService.loadConfig: Restored from backup');
          await this.saveConfig();
          return this.config;
        }
      } catch (backupError) {
        console.error('Échec restauration backup:', backupError);
      }

      // Reset à défaut si tout échoue
      console.warn('Reset à configuration par défaut');
      this.config = { ...DEFAULT_CONFIG };
      console.log('[DEBUG] PersistenceService.loadConfig: Reset to default config');
      await this.saveConfig();
      return this.config;
    }
  }

  /**
   * Valide et migre la configuration si nécessaire
   * @param {Object} config - Configuration à valider
   * @returns {Object} - Configuration validée
   */
  validateAndMigrate(config) {
    // Assurer la structure de base
    const validated = {
      version: config.version || CONFIG.CONFIG_VERSION,
      recentPdfs: Array.isArray(config.recentPdfs) ? config.recentPdfs : [],
      bookmarks: typeof config.bookmarks === 'object' && config.bookmarks !== null 
        ? config.bookmarks : {},
      folders: typeof config.folders === 'object' && config.folders !== null 
        ? config.folders : {}
    };

    // Migration de version 1.0 à 1.1 : ajouter folders vide
    if (validated.version === '1.0') {
      validated.version = '1.1';
      validated.folders = {};
    }

    // Limiter le nombre de PDFs récents
    if (validated.recentPdfs.length > CONFIG.MAX_RECENT_PDFS) {
      validated.recentPdfs = validated.recentPdfs.slice(0, CONFIG.MAX_RECENT_PDFS);
    }

    // Valider la structure des bookmarks
    for (const pdfPath of Object.keys(validated.bookmarks)) {
      const pdfData = validated.bookmarks[pdfPath];
      if (!pdfData || typeof pdfData !== 'object') {
        delete validated.bookmarks[pdfPath];
        continue;
      }

      // Assurer la structure des bookmarks
      if (!Array.isArray(pdfData.bookmarks)) {
        pdfData.bookmarks = [];
      }

      // Valider chaque bookmark
      pdfData.bookmarks = pdfData.bookmarks.filter(bookmark => {
        return bookmark && 
               typeof bookmark.id === 'string' &&
               typeof bookmark.page === 'number' &&
               bookmark.page > 0;
      });

      // INV-02: Assurer que les titres sont non-vides
      pdfData.bookmarks.forEach(bookmark => {
        if (!bookmark.title || typeof bookmark.title !== 'string' || !bookmark.title.trim()) {
          bookmark.title = `Page ${bookmark.page}`;
        }
      });
    }

    // Valider la structure des folders
    for (const folderId of Object.keys(validated.folders)) {
      const folder = validated.folders[folderId];
      if (!folder || typeof folder !== 'object') {
        delete validated.folders[folderId];
        continue;
      }

      // Assurer la structure des folders
      folder.name = typeof folder.name === 'string' ? folder.name.trim() : 'Dossier sans nom';
      folder.parentId = folder.parentId === null || typeof folder.parentId === 'string' ? folder.parentId : null;
      folder.childrenIds = Array.isArray(folder.childrenIds) ? folder.childrenIds.filter(id => typeof id === 'string') : [];
      folder.pdfPaths = Array.isArray(folder.pdfPaths) ? folder.pdfPaths.filter(path => typeof path === 'string') : [];
    }

    return validated;
  }

    console.log('[DEBUG] PersistenceService.saveConfig: Saving config');
  /**
   * Sauvegarde la configuration de manière atomique
   * RC1: Prévention de la perte de données
   */
  async saveConfig() {
    if (!this.config) return;

    try {
      // Créer un backup avant la sauvegarde
      const exists = await fs.pathExists(this.configPath);
      if (exists) {
        await fs.copy(this.configPath, this.backupPath);
      }

      // Écriture atomique: écrire dans un fichier temporaire puis renommer
      const tempPath = `${this.configPath}.tmp`;
      const data = JSON.stringify(this.config, null, 2);
      
      await fs.writeFile(tempPath, data, 'utf8');
      await fs.rename(tempPath, this.configPath);
      
      this.isDirty = false;
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      throw error;
    }
  }

  /**
   * Planifie une sauvegarde différée (debounce)
   * R3: Persistance automatique à chaque modification
   */
  scheduleSave() {
    this.isDirty = true;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      if (this.isDirty) {
        await this.saveConfig();
      }
    }, 500);
  }

  /**
   * Ajoute un PDF à la liste des récents
   * @param {string} pdfPath - Chemin du PDF
   */
  async addRecentPdf(pdfPath) {
    // Retirer si déjà présent
    this.config.recentPdfs = this.config.recentPdfs.filter(p => p !== pdfPath);
    
    // Ajouter au début
    this.config.recentPdfs.unshift(pdfPath);
    
    // Limiter la taille
    if (this.config.recentPdfs.length > CONFIG.MAX_RECENT_PDFS) {
      this.config.recentPdfs = this.config.recentPdfs.slice(0, CONFIG.MAX_RECENT_PDFS);
    }

    this.scheduleSave();
  }

  /**
   * Supprime un PDF de la liste des récents
   * @param {string} pdfPath - Chemin du PDF
   */
  async removeRecentPdf(pdfPath) {
    this.config.recentPdfs = this.config.recentPdfs.filter(p => p !== pdfPath);
    this.scheduleSave();
  }

  /**
   * Met à jour les métadonnées d'un PDF
   * @param {string} pdfPath - Chemin du PDF
   * @param {Object} metadata - Métadonnées à mettre à jour
   */
  async updatePdfMetadata(pdfPath, metadata) {
    if (!this.config.bookmarks[pdfPath]) {
      this.config.bookmarks[pdfPath] = {
        hash: null,
        lastOpened: null,
        bookmarks: []
      };
    }

    Object.assign(this.config.bookmarks[pdfPath], metadata);
    this.scheduleSave();
  }

  /**
   * Ajoute un bookmark
   * R5: Plusieurs bookmarks peuvent exister sur la même page
   * R6: Ordre chronologique par défaut
    console.log('[DEBUG] PersistenceService.addBookmark: Adding bookmark for', pdfPath, 'page', bookmarkData.page);
   * INV-02: Titre non-vide (défaut "Page X")
   * @param {string} pdfPath - Chemin du PDF
   * @param {Object} bookmarkData - Données du bookmark
   * @returns {Promise<Object>} - Bookmark créé
   */
  async addBookmark(pdfPath, bookmarkData) {
    if (!this.config.bookmarks[pdfPath]) {
      this.config.bookmarks[pdfPath] = {
        hash: null,
        lastOpened: null,
        bookmarks: []
      };
    }

    // INV-02: Valider et assurer un titre non-vide
    let title = bookmarkData.title;
    if (!title || typeof title !== 'string' || !title.trim()) {
      title = `Page ${bookmarkData.page}`;
    }

    const bookmark = {
      id: uuidv4(),
      page: bookmarkData.page,
      title: title,
      thumbnailPath: bookmarkData.thumbnailPath || null,
      createdAt: new Date().toISOString()
    };

    // R6: Ajouter à la fin (ordre chronologique)
    this.config.bookmarks[pdfPath].bookmarks.push(bookmark);
    
    this.scheduleSave();
    return bookmark;
  }

  /**
   * Met à jour un bookmark
   * INV-02: Le titre ne peut pas être vide
   * @param {string} pdfPath - Chemin du PDF
   * @param {string} bookmarkId - ID du bookmark
   * @param {Object} updates - Champs à mettre à jour
   * @returns {Promise<Object>} - Bookmark mis à jour
   */
  async updateBookmark(pdfPath, bookmarkId, updates) {
    const pdfData = this.config.bookmarks[pdfPath];
    if (!pdfData) {
      throw new Error('PDF non trouvé');
    }

    const bookmark = pdfData.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) {
      throw new Error('Bookmark non trouvé');
    }

    // Mettre à jour les champs autorisés
    if (updates.title !== undefined) {
      // INV-02: Empêcher les titres vides
      if (!updates.title || typeof updates.title !== 'string' || !updates.title.trim()) {
        bookmark.title = `Page ${bookmark.page}`;
      } else {
        bookmark.title = updates.title;
      }
    }
    if (updates.thumbnailPath !== undefined) {
      bookmark.thumbnailPath = updates.thumbnailPath;
    }

    this.scheduleSave();
    return bookmark;
  }

  /**
   * Supprime un bookmark
   * @param {string} pdfPath - Chemin du PDF
   * @param {string} bookmarkId - ID du bookmark
   * @returns {Promise<Object>} - Bookmark supprimé avec son chemin de miniature
   */
  async deleteBookmark(pdfPath, bookmarkId) {
    const pdfData = this.config.bookmarks[pdfPath];
    if (!pdfData) {
      throw new Error('PDF non trouvé');
    }

    const bookmarkIndex = pdfData.bookmarks.findIndex(b => b.id === bookmarkId);
    if (bookmarkIndex === -1) {
      throw new Error('Bookmark non trouvé');
    }

    const [deletedBookmark] = pdfData.bookmarks.splice(bookmarkIndex, 1);
    
    this.scheduleSave();
    return {
      bookmark: deletedBookmark,
      thumbnailPath: deletedBookmark.thumbnailPath
    };
  }

  /**
   * Récupère les bookmarks d'un PDF
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<Array>} - Liste des bookmarks
   */
  async getBookmarks(pdfPath) {
    const pdfData = this.config.bookmarks[pdfPath];
    return pdfData?.bookmarks || [];
  }

  /**
   * Supprime toutes les données associées au PDF (bookmarks, thumbnails, historique)
   * mais laisse le fichier physique intact
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<string[]>} - Chemins des miniatures à supprimer
   */
  async forgetPdf(pdfPath) {
    const thumbnailPaths = [];

    // Collecter les chemins des miniatures
    if (this.config.bookmarks[pdfPath]) {
      for (const bookmark of this.config.bookmarks[pdfPath].bookmarks || []) {
        if (bookmark.thumbnailPath) {
          thumbnailPaths.push(bookmark.thumbnailPath);
        }
      }
    }

    // Supprimer toutes les données du PDF
    delete this.config.bookmarks[pdfPath];

    // Supprimer de l'historique récent
    this.config.recentPdfs = this.config.recentPdfs.filter(p => p !== pdfPath);

    // Sauvegarde immédiate (au lieu de scheduleSave) pour garantir la cohérence.
    // Cette action critique doit être persistée sur le disque AVANT tout rechargement
    // de config par le renderer (via getRecentPdfs/getBookmarks).
    await this.saveConfig();
    
    return thumbnailPaths;
  }

  /**
   * Réorganise les bookmarks selon un nouvel ordre
   * R6: Ordre réorganisable par l'utilisateur
   * @param {string} pdfPath - Chemin du PDF
   * @param {string[]} bookmarkIds - Nouvel ordre des IDs
   */
  async reorderBookmarks(pdfPath, bookmarkIds) {
    const pdfData = this.config.bookmarks[pdfPath];
    if (!pdfData) return;

    const bookmarkMap = new Map(pdfData.bookmarks.map(b => [b.id, b]));
    const reordered = [];

    for (const id of bookmarkIds) {
      const bookmark = bookmarkMap.get(id);
      if (bookmark) {
        reordered.push(bookmark);
        bookmarkMap.delete(id);
      }
    }

    // Ajouter les bookmarks restants non inclus dans l'ordre
    for (const bookmark of bookmarkMap.values()) {
      reordered.push(bookmark);
    }

    pdfData.bookmarks = reordered;
    this.scheduleSave();
  }

  /**
   * Charge les dossiers depuis la configuration
   * @returns {Promise<Object>} - Objet folders
   */
  async loadFolders() {
    return this.config.folders || {};
  }

  /**
   * Sauvegarde les dossiers dans la configuration
   * R18: Persistance automatique des dossiers
   */
  async saveFolders() {
    this.scheduleSave();
  }
}

module.exports = PersistenceService;