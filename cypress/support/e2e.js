// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Global hooks
beforeEach(() => {
  cy.visit('/');
  cy.window().then((win) => {
    win.electronAPI = {
      getRecentPdfs: cy.stub().resolves({ recentPdfs: [] }),
      loadPdf: cy.stub().resolves({ success: true, data: new ArrayBuffer(8), hash: 'mockhash', hashChanged: false, bookmarks: [] }),
      getBookmarks: cy.stub().resolves({ success: true, bookmarks: [] }),
      addBookmark: cy.stub().resolves({ success: true }),
      openPdfDialog: cy.stub().resolves('test.pdf'),
      removeRecentPdf: cy.stub().resolves({ success: true }),
      forgetPdf: cy.stub().resolves({ success: true }),
      deletePdf: cy.stub().resolves({ success: true }),
    };
  });
});