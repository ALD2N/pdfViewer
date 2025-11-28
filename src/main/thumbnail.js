/**
 * Service de génération de miniatures
 * Gère le cache des miniatures sur disque
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { CONFIG } = require('../shared/constants.js');

class ThumbnailService {
  /**
   * @param {string} configDir - Dossier de configuration
   */
  constructor(configDir) {
    this.thumbnailsDir = path.join(configDir, CONFIG.THUMBNAILS_DIR);
  }

  /**
   * Initialise le service
   */
  async init() {
    await fs.ensureDir(this.thumbnailsDir);
  }

  /**
   * Génère un nom de fichier unique pour la miniature
   * @param {string} pdfPath - Chemin du PDF
   * @param {number} pageNum - Numéro de page
   * @returns {string} - Nom de fichier
   */
  generateThumbnailFilename(pdfPath, pageNum) {
    const hash = crypto.createHash('md5').update(pdfPath).digest('hex').slice(0, 12);
    return `${hash}_page${pageNum}.jpg`;
  }

  /**
   * Obtient le chemin complet d'une miniature
   * @param {string} pdfPath - Chemin du PDF
   * @param {number} pageNum - Numéro de page
   * @returns {string} - Chemin complet
   */
  getThumbnailPath(pdfPath, pageNum) {
    const filename = this.generateThumbnailFilename(pdfPath, pageNum);
    return path.join(this.thumbnailsDir, filename);
  }

  /**
   * Vérifie si une miniature existe déjà en cache
   * @param {string} pdfPath - Chemin du PDF
   * @param {number} pageNum - Numéro de page
   * @returns {Promise<string|null>} - Chemin si existe, null sinon
   */
  async checkCache(pdfPath, pageNum) {
    const thumbnailPath = this.getThumbnailPath(pdfPath, pageNum);
    const exists = await fs.pathExists(thumbnailPath);
    return exists ? thumbnailPath : null;
  }

  /**
   * Génère une miniature pour une page
   * INV-03: Miniatures générées uniquement pour pages bookmarkées
   * La génération réelle se fait côté renderer avec canvas
   * Cette méthode sauvegarde les données reçues
   * @param {string} pdfPath - Chemin du PDF
   * @param {number} pageNum - Numéro de page
   * @param {string} imageData - Données image en base64 (data URL)
   * @returns {Promise<string>} - Chemin de la miniature sauvegardée
   */
  async generateThumbnail(pdfPath, pageNum, imageData) {
    const thumbnailPath = this.getThumbnailPath(pdfPath, pageNum);

    // Si imageData est fourni, c'est une data URL
    if (imageData && imageData.startsWith('data:image/')) {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(thumbnailPath, buffer);
      return thumbnailPath;
    }

    // Sinon, retourner le chemin existant si disponible
    const cached = await this.checkCache(pdfPath, pageNum);
    if (cached) {
      return cached;
    }

    // Si pas de données et pas de cache, retourner le chemin pour génération ultérieure
    return thumbnailPath;
  }

  /**
   * Sauvegarde une miniature à partir de données base64
   * @param {string} thumbnailPath - Chemin de destination
   * @param {string} base64Data - Données en base64
   */
  async saveThumbnail(thumbnailPath, base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(thumbnailPath, buffer);
  }

  /**
   * Supprime une miniature
   * @param {string} thumbnailPath - Chemin de la miniature
   */
  async deleteThumbnail(thumbnailPath) {
    try {
      const exists = await fs.pathExists(thumbnailPath);
      if (exists) {
        await fs.unlink(thumbnailPath);
      }
    } catch (error) {
      console.error('Erreur suppression miniature:', error);
    }
  }

  /**
   * Nettoie les miniatures orphelines
   * @param {Array<string>} validPaths - Liste des chemins de miniatures valides
   */
  async cleanOrphanedThumbnails(validPaths) {
    try {
      const files = await fs.readdir(this.thumbnailsDir);
      const validSet = new Set(validPaths.map(p => path.basename(p)));

      for (const file of files) {
        if (!validSet.has(file)) {
          await fs.unlink(path.join(this.thumbnailsDir, file));
        }
      }
    } catch (error) {
      console.error('Erreur nettoyage miniatures:', error);
    }
  }
}

module.exports = ThumbnailService;