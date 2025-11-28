/**
 * Processus principal Electron - PDF Viewer
 * Gère les opérations système, la persistance et les IPC
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { IPC_CHANNELS, CONFIG } = require('../shared/constants.js');
const PersistenceService = require('./persistence.js');
const ThumbnailService = require('./thumbnail.js');

let mainWindow = null;
let persistenceService = null;
let thumbnailService = null;

/**
 * Crée la fenêtre principale de l'application
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Nécessaire pour certaines opérations Electron
    },
    show: false
  });

  // Mode test : servir sur localhost:3000
  if (process.env.ELECTRON_ENV === 'test') {
    const express = require('express');
    const serverApp = express();
    serverApp.use(express.static(path.join(__dirname, '../renderer')));
    serverApp.listen(3000, () => console.log('Test server running on http://localhost:3000'));
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Ouvrir DevTools en développement
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Initialise les services de l'application
 */
async function initServices() {
  const configDir = path.join(app.getPath('home'), '.config', CONFIG.APP_NAME);
  await fs.ensureDir(configDir);

  persistenceService = new PersistenceService(configDir);
  await persistenceService.init();

  thumbnailService = new ThumbnailService(configDir);
  await thumbnailService.init();
}

/**
 * Calcule le hash MD5 d'un fichier PDF
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<string>} - Hash MD5
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Valide qu'un chemin pointe vers un fichier PDF existant
 * INV-05: Les chemins de fichiers sont validés avant toute opération
 * @param {string} filePath - Chemin à valider
 * @returns {Promise<boolean>}
 */
async function validatePdfPath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  // Vérifier l'extension
  if (!filePath.toLowerCase().endsWith('.pdf')) {
    return false;
  }
  
  // Vérifier l'existence du fichier
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

// ============================================
// GESTIONNAIRES IPC
// ============================================

/**
 * IPC: Ouvrir le dialogue de sélection de fichier PDF
 */
ipcMain.handle(IPC_CHANNELS.PDF_OPEN_DIALOG, async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Ouvrir un PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

/**
 * IPC: Charger un fichier PDF
 * R4: En cas de fichier introuvable, afficher une erreur
 * INV-04: Le hash est vérifié à chaque ouverture
 */
ipcMain.handle(IPC_CHANNELS.PDF_LOAD, async (event, filePath) => {
  // INV-05: Validation du chemin
  const isValid = await validatePdfPath(filePath);
  if (!isValid) {
    return { 
      success: false, 
      error: 'Fichier PDF introuvable ou invalide',
      code: 'FILE_NOT_FOUND'
    };
  }

  try {
    // Lire le fichier PDF
    const pdfBuffer = await fs.readFile(filePath);

    // INV-04: Calculer le hash pour détecter les modifications
    const currentHash = await calculateFileHash(filePath);
    
    // Récupérer les données existantes pour ce PDF
    const config = await persistenceService.loadConfig();
    const pdfBookmarkData = config.bookmarks[filePath];
    
    let hashChanged = false;
    if (pdfBookmarkData && pdfBookmarkData.hash !== currentHash) {
      hashChanged = true;
    }

    // Mettre à jour les PDFs récents
    await persistenceService.addRecentPdf(filePath);
    
    // Mettre à jour le hash et lastOpened
    await persistenceService.updatePdfMetadata(filePath, {
      hash: currentHash,
      lastOpened: new Date().toISOString()
    });

    return {
      success: true,
      data: pdfBuffer,
      path: filePath,
      hash: currentHash,
      hashChanged,
      bookmarks: pdfBookmarkData?.bookmarks || []
    };
  } catch (error) {
    console.error('Erreur chargement PDF:', error);
    return { 
      success: false, 
      error: error.message,
      code: 'LOAD_ERROR'
    };
  }
});

/**
 * IPC: Récupérer la liste des PDFs récemment ouverts
 */
ipcMain.handle(IPC_CHANNELS.PDF_GET_RECENT, async () => {
  try {
    const config = await persistenceService.loadConfig();
    const recentPdfs = [];

    for (const pdfPath of config.recentPdfs) {
      const exists = await validatePdfPath(pdfPath);
      const metadata = config.bookmarks[pdfPath] || {};
      
      recentPdfs.push({
        path: pdfPath,
        name: path.basename(pdfPath),
        exists,
        lastOpened: metadata.lastOpened || null,
        bookmarkCount: metadata.bookmarks?.length || 0
      });
    }

    return { success: true, recentPdfs };
  } catch (error) {
    console.error('Erreur récupération PDFs récents:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Supprimer un PDF de l'historique récent
 * R4: Permettre de supprimer de l'historique
 */
ipcMain.handle(IPC_CHANNELS.PDF_REMOVE_RECENT, async (event, filePath) => {
  console.log('Tentative de suppression du PDF récent:', filePath);
  try {
    await persistenceService.removeRecentPdf(filePath);
    console.log('PDF supprimé avec succès:', filePath);
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression PDF récent:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Oublier un PDF - supprime toutes les données mais laisse le fichier intact
 */
ipcMain.handle(IPC_CHANNELS.PDF_FORGET, async (event, filePath) => {
  console.log('Tentative d\'oubli du PDF:', filePath);
  
  // INV-05: Validation du chemin
  if (!filePath || typeof filePath !== 'string') {
    return { 
      success: false, 
      error: 'Chemin de fichier invalide',
      code: 'INVALID_PATH'
    };
  }

  try {
    // Récupérer les chemins des miniatures à supprimer
    const thumbnailPaths = await persistenceService.forgetPdf(filePath);
    
    // Supprimer les miniatures associées
    for (const thumbPath of thumbnailPaths) {
      try {
        await thumbnailService.deleteThumbnail(thumbPath);
        console.log('Miniature supprimée:', thumbPath);
      } catch (thumbError) {
        console.warn('Erreur suppression miniature:', thumbError);
        // Ne pas bloquer si la suppression d'une miniature échoue
      }
    }
    
    console.log('PDF oublié avec succès:', filePath);
    return { 
      success: true,
      thumbnailsDeleted: thumbnailPaths.length
    };
  } catch (error) {
    console.error('Erreur oubli PDF:', error);
    return { 
      success: false, 
      error: error.message,
      code: 'FORGET_ERROR'
    };
  }
});

/**
 * IPC: Supprimer un PDF du disque et de toutes ses données
 * Supprime le fichier physique, les miniatures associées et toutes les métadonnées
 */
ipcMain.handle(IPC_CHANNELS.PDF_DELETE, async (event, filePath) => {
  console.log('Tentative de suppression physique du PDF:', filePath);
  
  // INV-05: Validation du chemin
  if (!filePath || typeof filePath !== 'string') {
    return { 
      success: false, 
      error: 'Chemin de fichier invalide',
      code: 'INVALID_PATH'
    };
  }

  try {
    // Récupérer les chemins des miniatures à supprimer
    const thumbnailPaths = await persistenceService.deletePdfData(filePath);
    
    // Supprimer les miniatures associées
    for (const thumbPath of thumbnailPaths) {
      try {
        await thumbnailService.deleteThumbnail(thumbPath);
        console.log('Miniature supprimée:', thumbPath);
      } catch (thumbError) {
        console.warn('Erreur suppression miniature:', thumbError);
        // Ne pas bloquer si la suppression d'une miniature échoue
      }
    }
    
    // Vérifier que le fichier existe
    const exists = await fs.pathExists(filePath);
    
    // Supprimer le fichier PDF physiquement (si existe)
    if (exists) {
      await fs.unlink(filePath);
      console.log('Fichier PDF supprimé du disque:', filePath);
    } else {
      console.log('Fichier PDF déjà absent du disque:', filePath);
    }
    
    return { 
      success: true,
      fileExisted: exists,
      thumbnailsDeleted: thumbnailPaths.length
    };
  } catch (error) {
    console.error('Erreur suppression PDF:', error);
    
    // Gérer les erreurs de permissions
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return {
        success: false,
        error: 'Permission refusée pour supprimer ce fichier',
        code: 'PERMISSION_DENIED'
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      code: 'DELETE_ERROR'
    };
  }
});

/**
ipcMain.handle(IPC_CHANNELS.PDF_VERIFY, async (event, filePath) => {
  const exists = await validatePdfPath(filePath);
  if (!exists) {
    return { success: true, exists: false };
  }

  try {
    const hash = await calculateFileHash(filePath);
    const config = await persistenceService.loadConfig();
    const storedHash = config.bookmarks[filePath]?.hash;

    return {
      success: true,
      exists: true,
      hash,
      hashChanged: storedHash && storedHash !== hash
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Ajouter un bookmark
 * R2: Chaque bookmark est associé à une page unique
 * R3: Persistance automatique à chaque modification
 * R5: Plusieurs bookmarks peuvent exister sur la même page
 * INV-02: Titre non-vide (défaut "Page X")
 */
ipcMain.handle(IPC_CHANNELS.BOOKMARK_ADD, async (event, { pdfPath, page, title }) => {
  try {
    // INV-02: Titre par défaut si non fourni
    const bookmarkTitle = title && title.trim() ? title.trim() : `Page ${page}`;
    
    const bookmark = await persistenceService.addBookmark(pdfPath, {
      page,
      title: bookmarkTitle
    });

    // Récupérer tous les bookmarks pour retourner la liste complète
    const bookmarks = await persistenceService.getBookmarks(pdfPath);

    return { success: true, bookmark, bookmarks };
  } catch (error) {
    console.error('Erreur ajout bookmark:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Mettre à jour un bookmark
 * INV-02: Titre toujours non-vide
 */
ipcMain.handle(IPC_CHANNELS.BOOKMARK_UPDATE, async (event, { pdfPath, bookmarkId, updates }) => {
  try {
    // INV-02: Valider le titre si modifié
    if (updates.title !== undefined) {
      if (!updates.title || !updates.title.trim()) {
        return { success: false, error: 'Le titre ne peut pas être vide' };
      }
      updates.title = updates.title.trim();
    }

    const bookmark = await persistenceService.updateBookmark(pdfPath, bookmarkId, updates);
    const bookmarks = await persistenceService.getBookmarks(pdfPath);

    return { success: true, bookmark, bookmarks };
  } catch (error) {
    console.error('Erreur mise à jour bookmark:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Supprimer un bookmark
 */
ipcMain.handle(IPC_CHANNELS.BOOKMARK_DELETE, async (event, { pdfPath, bookmarkId }) => {
  try {
    // Supprimer aussi la miniature associée
    const config = await persistenceService.loadConfig();
    const bookmark = config.bookmarks[pdfPath]?.bookmarks?.find(b => b.id === bookmarkId);
    
    if (bookmark?.thumbnailPath) {
      await thumbnailService.deleteThumbnail(bookmark.thumbnailPath);
    }

    await persistenceService.deleteBookmark(pdfPath, bookmarkId);
    const bookmarks = await persistenceService.getBookmarks(pdfPath);

    return { success: true, bookmarks };
  } catch (error) {
    console.error('Erreur suppression bookmark:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Réorganiser les bookmarks
 * R6: Ordre réorganisable par l'utilisateur
 */
ipcMain.handle(IPC_CHANNELS.BOOKMARK_REORDER, async (event, { pdfPath, bookmarkIds }) => {
  try {
    await persistenceService.reorderBookmarks(pdfPath, bookmarkIds);
    const bookmarks = await persistenceService.getBookmarks(pdfPath);

    return { success: true, bookmarks };
  } catch (error) {
    console.error('Erreur réorganisation bookmarks:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Récupérer tous les bookmarks d'un PDF
 */
ipcMain.handle(IPC_CHANNELS.BOOKMARK_GET_ALL, async (event, pdfPath) => {
  try {
    const bookmarks = await persistenceService.getBookmarks(pdfPath);
    return { success: true, bookmarks };
  } catch (error) {
    console.error('Erreur récupération bookmarks:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Générer une miniature
 * INV-03: Miniatures générées uniquement pour pages bookmarkées
 */
ipcMain.handle(IPC_CHANNELS.THUMBNAIL_GENERATE, async (event, { pdfPath, pageNum, imageData }) => {
  try {
    const thumbnailPath = await thumbnailService.generateThumbnail(pdfPath, pageNum, imageData);
    return { success: true, thumbnailPath };
  } catch (error) {
    console.error('Erreur génération miniature:', error);
    return { success: false, error: error.message };
  }
});

/**
 * IPC: Récupérer une miniature existante
 */
ipcMain.handle(IPC_CHANNELS.THUMBNAIL_GET, async (event, thumbnailPath) => {
  try {
    const exists = await fs.pathExists(thumbnailPath);
    if (!exists) {
      return { success: false, error: 'Miniature non trouvée' };
    }

    const data = await fs.readFile(thumbnailPath);
    return { 
      success: true, 
      data: `data:image/jpeg;base64,${data.toString('base64')}`
    };
  } catch (error) {
    console.error('Erreur récupération miniature:', error);
    return { success: false, error: error.message };
  }
});

// ============================================
// CYCLE DE VIE APPLICATION
// ============================================

app.whenReady().then(async () => {
  await initServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Sauvegarde automatique avant fermeture
app.on('before-quit', async () => {
  if (persistenceService) {
    await persistenceService.saveConfig();
  }
});