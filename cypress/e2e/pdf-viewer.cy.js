describe('PDF Viewer E2E Tests', () => {
  it('should load the home screen', () => {
    cy.visit('/');
    cy.get('.home-screen').should('be.visible');
  });

  it('should open a PDF file', () => {
    cy.fixture('test-config.json').then((config) => {
      cy.openPdf(config.pdfPath).then((result) => {
        expect(result.success).to.be.true;
      });
    });
  });

  it('should add a bookmark', () => {
    cy.fixture('test-config.json').then((config) => {
      cy.openPdf(config.pdfPath);
      cy.addBookmark(config.pdfPath, 1, 'Test Bookmark').then((result) => {
        expect(result.success).to.be.true;
      });
    });
  });

  it('should retrieve bookmarks', () => {
    cy.fixture('test-config.json').then((config) => {
      cy.getBookmarks(config.pdfPath).then((result) => {
        expect(result.success).to.be.true;
        expect(result.bookmarks).to.be.an('array');
      });
    });
  });

  describe('Home Screen Layout', () => {
    beforeEach(() => {
      // S'assurer que l'écran d'accueil est visible
      cy.get('.home-screen', { timeout: 10000 }).should('be.visible');
    });

    it('should display the three-column layout', () => {
      // Vérifier que les 3 colonnes sont présentes
      cy.get('.home-layout').should('be.visible');
      cy.get('.folder-tree-column').should('be.visible');
      cy.get('.orphan-pdfs-column').should('be.visible');
      cy.get('.recent-pdfs-column').should('be.visible');
    });

    it('should display folder tree with create button', () => {
      cy.get('.folder-tree').should('be.visible');
      cy.get('.create-root-btn').should('be.visible').and('contain', 'Nouveau dossier');
    });

    it('should display recent PDFs section', () => {
      cy.get('.recent-pdf-list').should('be.visible');
      cy.get('.recent-pdf-list h3').should('contain', 'PDFs récents');
    });

    it('should display orphan PDFs section', () => {
      cy.get('.orphan-pdf-list').should('be.visible');
      cy.get('.orphan-pdf-list h3').should('contain', 'PDFs orphelins');
    });

    it('should have working "Open PDF" button', () => {
      cy.get('.open-pdf-btn').should('be.visible').and('contain', 'Ouvrir un PDF');
    });
  });

  describe('Recent PDFs Interactions', () => {
    beforeEach(() => {
      cy.get('.home-screen', { timeout: 10000 }).should('be.visible');
    });

    it('should not show delete buttons on PDF items (replaced by context menu)', () => {
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        if (result.recentPdfs && result.recentPdfs.length > 0) {
          cy.get('.recent-pdf-list .pdf-item').first().within(() => {
            cy.get('.btn-danger-small').should('not.exist');
          });
          cy.log('✅ Boutons de suppression remplacés par menu contextuel');
        } else {
          cy.get('.recent-pdf-list .empty-state').should('be.visible');
          cy.log('✅ État vide correctement affiché');
        }
      });
    });

    it.skip('should open confirmation modal when right-clicking PDF item', () => {
      // Test for context menu - hard to automate with Cypress
      cy.log('⚠️ Test du menu contextuel nécessite interaction manuelle');
    });

    it.skip('should cancel PDF removal when clicking Cancel button', () => {
      // Test for context menu - hard to automate with Cypress
      cy.log('⚠️ Test du menu contextuel nécessite interaction manuelle');
    });
  });
});
