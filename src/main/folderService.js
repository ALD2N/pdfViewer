/**
 * Service de gestion des dossiers virtuels hiérarchiques
 * Implémente la logique métier pour les dossiers (R12-R20)
 */

const { v4: uuidv4 } = require('uuid');

class FolderService {
  /**
   * @param {PersistenceService} persistenceService - Service de persistance
   */
  constructor(persistenceService) {
    this.persistence = persistenceService;
    this.folders = {};
  }

  /**
   * Initialise le service en chargeant les dossiers
   */
  async init() {
    this.folders = await this.persistence.loadFolders();
  }

  /**
   * Valide un nom de dossier (non-vide, unique par parent)
   * R12: Noms uniques par parent
   * R15: Nom non-vide
   * @param {string} name - Nom à valider
   * @param {string|null} parentId - ID du parent
   * @param {string} [excludeId] - ID à exclure de la vérification d'unicité
   * @returns {boolean}
   */
  validateFolderName(name, parentId, excludeId = null) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return false;
    }

    const trimmedName = name.trim();
    for (const [id, folder] of Object.entries(this.folders)) {
      if (id !== excludeId && folder.parentId === parentId && folder.name === trimmedName) {
        return false;
      }
    }
    return true;
  }

  /**
   * Vérifie qu'il n'y a pas de cycle dans la hiérarchie
   * @param {string} folderId - ID du dossier à déplacer
   * @param {string} newParentId - Nouvel ID parent
   * @returns {boolean}
   */
  hasCycle(folderId, newParentId) {
    if (!newParentId) return false;
    let current = newParentId;
    while (current) {
      if (current === folderId) return true;
      current = this.folders[current]?.parentId;
    }
    return false;
  }

  /**
   * Crée un nouveau dossier
   * R12: Profondeur illimitée, noms uniques par parent
   * @param {string} name - Nom du dossier
   * @param {string|null} parentId - ID du parent (null pour racine)
   * @returns {Promise<Object>} - Dossier créé
   */
  async createFolder(name, parentId) {
    // Valider que le parent existe s'il est fourni
    if (parentId && !this.folders[parentId]) {
      throw new Error('Dossier parent non trouvé');
    }

    if (!this.validateFolderName(name, parentId)) {
      throw new Error('Nom de dossier invalide ou déjà utilisé');
    }

    const id = uuidv4();
    const folder = {
      name: name.trim(),
      parentId: parentId,
      childrenIds: [],
      pdfPaths: []
    };

    this.folders[id] = folder;

    // Ajouter à childrenIds du parent
    if (parentId) {
      this.folders[parentId].childrenIds.push(id);
    }

    await this.persistence.saveFolders(this.folders);
    return { id, ...folder };
  }

  /**
   * Met à jour un dossier
   * @param {string} id - ID du dossier
   * @param {Object} updates - Champs à mettre à jour
   * @returns {Promise<Object>} - Dossier mis à jour
   */
  async updateFolder(id, updates) {
    const folder = this.folders[id];
    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    if (updates.name !== undefined) {
      if (!this.validateFolderName(updates.name, folder.parentId, id)) {
        throw new Error('Nom de dossier invalide ou déjà utilisé');
      }
      folder.name = updates.name.trim();
    }

    if (updates.parentId !== undefined) {
      if (this.hasCycle(id, updates.parentId)) {
        throw new Error('Déplacement créerait un cycle');
      }

      // Retirer de l'ancien parent
      if (folder.parentId && this.folders[folder.parentId]) {
        this.folders[folder.parentId].childrenIds = this.folders[folder.parentId].childrenIds.filter(childId => childId !== id);
      }

      // Ajouter au nouveau parent
      if (updates.parentId && this.folders[updates.parentId]) {
        this.folders[updates.parentId].childrenIds.push(id);
      }

      folder.parentId = updates.parentId;
    }

    await this.persistence.saveFolders(this.folders);
    return { id, ...folder };
  }

  /**
   * Supprime un dossier récursivement
   * R14: Suppression récursive, dissociation PDFs
   * @param {string} id - ID du dossier
   * @returns {Promise<void>}
   */
  async deleteFolder(id) {
    const folder = this.folders[id];
    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    // Suppression récursive des enfants
    for (const childId of [...folder.childrenIds]) {
      await this.deleteFolder(childId);
    }

    // Retirer de childrenIds du parent
    if (folder.parentId && this.folders[folder.parentId]) {
      this.folders[folder.parentId].childrenIds = this.folders[folder.parentId].childrenIds.filter(childId => childId !== id);
    }

    // Dissocier les PDFs (pas de suppression physique)
    // Les PDFs restent dans d'autres dossiers ou deviennent orphelins

    delete this.folders[id];
    await this.persistence.saveFolders(this.folders);
  }

  /**
   * Assigne un PDF à un dossier
   * R13: Relation M:N
   * R17: Prévention doublons
   * @param {string} folderId - ID du dossier
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<void>}
   */
  async assignPdfToFolder(folderId, pdfPath) {
    const folder = this.folders[folderId];
    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    if (!folder.pdfPaths.includes(pdfPath)) {
      folder.pdfPaths.push(pdfPath);
      await this.persistence.saveFolders(this.folders);
    }
  }

  /**
   * Désassigne un PDF d'un dossier
   * @param {string} folderId - ID du dossier
   * @param {string} pdfPath - Chemin du PDF
   * @returns {Promise<void>}
   */
  async unassignPdfFromFolder(folderId, pdfPath) {
    const folder = this.folders[folderId];
    if (!folder) {
      throw new Error('Dossier non trouvé');
    }

    folder.pdfPaths = folder.pdfPaths.filter(path => path !== pdfPath);
    await this.persistence.saveFolders(this.folders);
  }

  /**
   * Récupère tous les dossiers
   * @returns {Object} - Objet folders
   */
  getFolders() {
    return { ...this.folders };
  }

  /**
   * Récupère les PDFs assignés à un dossier
   * @param {string} folderId - ID du dossier
   * @returns {string[]} - Liste des chemins PDF
   */
  getFolderPdfs(folderId) {
    const folder = this.folders[folderId];
    return folder ? [...folder.pdfPaths] : [];
  }

  /**
   * Récupère tous les PDFs assignés à au moins un dossier
   * @returns {Set<string>} - Ensemble des chemins PDF assignés
   */
  getAssignedPdfs() {
    const assigned = new Set();
    for (const folder of Object.values(this.folders)) {
      for (const pdfPath of folder.pdfPaths) {
        assigned.add(pdfPath);
      }
    }
    return assigned;
  }
}

module.exports = FolderService;
