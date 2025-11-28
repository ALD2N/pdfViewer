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
});