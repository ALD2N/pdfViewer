// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom commands for Electron API
Cypress.Commands.add('openPdf', (pdfPath) => {
  cy.window().then((win) => {
    return win.electronAPI.loadPdf(pdfPath);
  });
});

Cypress.Commands.add('getBookmarks', (pdfPath) => {
  cy.window().then((win) => {
    return win.electronAPI.getBookmarks(pdfPath);
  });
});

Cypress.Commands.add('addBookmark', (pdfPath, page, title) => {
  cy.window().then((win) => {
    return win.electronAPI.addBookmark(pdfPath, page, title);
  });
});