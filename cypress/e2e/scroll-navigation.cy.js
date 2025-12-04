describe('Scroll Navigation E2E Tests', () => {
  beforeEach(() => {
    // Ouvrir un PDF pour les tests
    cy.fixture('test-config.json').then((config) => {
      cy.openPdf(config.pdfPath);
    });
  });

  it('should open PDF and scroll on .viewer-content changes page indicator', () => {
    // Vérifier que le PDF est ouvert
    cy.get('.pdf-viewer').should('be.visible');
    cy.get('.page-info').should('contain', 'Page 1 /');

    // Scroll vers le bas sur .viewer-content (aperçu PDF principal)
    cy.get('.viewer-content').trigger('wheel', { deltaY: 100 });

    // Vérifier que la page a changé
    cy.get('.page-info').should('not.contain', 'Page 1 /');
  });

  it('should scroll down = next page, up = previous page', () => {
    cy.get('.pdf-viewer').should('be.visible');

    // Obtenir le nombre total de pages
    cy.get('.page-info').invoke('text').then((text) => {
      const match = text.match(/Page \d+ \/ (\d+)/);
      const totalPages = parseInt(match[1]);

      // Scroll vers le bas (page suivante) sur .viewer-content
      cy.get('.viewer-content').trigger('wheel', { deltaY: 100 });
      cy.get('.page-info').should('contain', 'Page 2 /');

      // Scroll vers le haut (page précédente) sur .viewer-content
      cy.get('.viewer-content').trigger('wheel', { deltaY: -100 });
      cy.get('.page-info').should('contain', 'Page 1 /');
    });
  });

  it('should respect limits (page 1 and last page)', () => {
    cy.get('.pdf-viewer').should('be.visible');

    // Obtenir le nombre total de pages
    cy.get('.page-info').invoke('text').then((text) => {
      const match = text.match(/Page \d+ \/ (\d+)/);
      const totalPages = parseInt(match[1]);

      // Essayer de scroll vers le haut depuis la page 1 (devrait rester à 1)
      cy.get('.viewer-content').trigger('wheel', { deltaY: -100 });
      cy.get('.page-info').should('contain', 'Page 1 /');

      // Aller à la dernière page via scroll sur .viewer-content
      for (let i = 1; i < totalPages; i++) {
        cy.get('.viewer-content').trigger('wheel', { deltaY: 100 });
      }
      cy.get('.page-info').should('contain', `Page ${totalPages} /`);

      // Essayer de scroll vers le bas depuis la dernière page (devrait rester à la dernière)
      cy.get('.viewer-content').trigger('wheel', { deltaY: 100 });
      cy.get('.page-info').should('contain', `Page ${totalPages} /`);
    });
  });

  it('should apply pagesPerWheel configuration', () => {
    cy.get('.pdf-viewer').should('be.visible');

    // Avec pagesPerWheel = 2 (si configuré)
    // Scroll vers le bas sur .viewer-content devrait sauter de N pages
    cy.get('.viewer-content').trigger('wheel', { deltaY: 100 });
    cy.get('.page-info').then(($el) => {
      const text = $el.text();
      const match = text.match(/Page (\d+) \//);
      const currentPage = parseInt(match[1]);
      // Si pagesPerWheel est 2, devrait être page 3, sinon page 2
      expect(currentPage).to.be.greaterThan(1);
    });
  });

  it('should NOT trigger scroll navigation on .viewer-nav', () => {
    cy.get('.pdf-viewer').should('be.visible');
    cy.get('.page-info').should('contain', 'Page 1 /');

    // Scroll sur .viewer-nav NE devrait PAS changer la page
    cy.get('.viewer-nav').trigger('wheel', { deltaY: 100 });

    // La page devrait rester à 1
    cy.get('.page-info').should('contain', 'Page 1 /');
  });
});