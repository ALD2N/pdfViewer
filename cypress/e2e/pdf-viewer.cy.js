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

    it('should show delete button on PDF items if they exist', () => {
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        if (result.recentPdfs && result.recentPdfs.length > 0) {
          cy.get('.recent-pdf-list .pdf-item').first().within(() => {
            cy.get('.btn-danger-small').should('be.visible');
          });
          cy.log('✅ Bouton de suppression visible');
        } else {
          cy.get('.recent-pdf-list .empty-state').should('be.visible');
          cy.log('✅ État vide correctement affiché');
        }
      });
    });

    it('should open confirmation modal when clicking delete button', () => {
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        if (result.recentPdfs && result.recentPdfs.length > 0) {
          // Cliquer sur le bouton de suppression
          cy.get('.recent-pdf-list .pdf-item').first().within(() => {
            cy.get('.btn-danger-small').click();
          });

          // Vérifier que le modal apparaît
          cy.get('.confirm-overlay', { timeout: 2000 }).should('be.visible');
          cy.get('.confirm-modal').should('be.visible');
          cy.get('.confirm-modal h3').should('contain', 'Retirer ce PDF');
          cy.get('.confirm-modal .btn-secondary').should('contain', 'Annuler');
          cy.get('.confirm-modal .btn-danger').should('contain', 'Retirer');
          
          // Annuler pour ne pas modifier l'état
          cy.get('.confirm-modal .btn-secondary').click();
          cy.get('.confirm-overlay').should('not.exist');
          cy.log('✅ Modal de confirmation fonctionne');
        } else {
          cy.log('⚠️ Aucun PDF récent, test skippé');
        }
      });
    });

    it('should cancel PDF removal when clicking Cancel button', () => {
      cy.window().then((win) => {
        return win.electronAPI.getRecentPdfs();
      }).then((result) => {
        if (result.recentPdfs && result.recentPdfs.length > 0) {
          const initialCount = result.recentPdfs.length;

          // Cliquer sur le bouton de suppression
          cy.get('.recent-pdf-list .pdf-item').first().within(() => {
            cy.get('.btn-danger-small').click();
          });

          // Vérifier que le modal apparaît
          cy.get('.confirm-overlay', { timeout: 2000 }).should('be.visible');

          // Annuler
          cy.get('.confirm-modal .btn-secondary').click();

          // Vérifier que le modal se ferme
          cy.get('.confirm-overlay').should('not.exist');

          // Vérifier que le nombre de PDFs n'a pas changé
          cy.window().then((win) => {
            return win.electronAPI.getRecentPdfs();
          }).then((result2) => {
            expect(result2.recentPdfs.length).to.equal(initialCount);
            cy.log('✅ Annulation réussie');
          });
        } else {
          cy.log('⚠️ Aucun PDF récent, test skippé');
        }
      });
    });
  });
});
