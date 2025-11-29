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

// Mock data for recent PDFs
let mockRecentPdfs = [
  {
    path: 'test.pdf',
    name: 'test.pdf',
    exists: true,
    lastOpened: '2023-11-29T10:00:00.000Z',
    bookmarkCount: 0
  }
];

// Global hooks
beforeEach(() => {
  cy.visit('/', {
    onBeforeLoad: (win) => {
      win.electronAPI = {
        getRecentPdfs: () => Promise.resolve({ success: true, recentPdfs: mockRecentPdfs.slice() }),
        loadPdf: () => Promise.resolve({ success: true, data: new ArrayBuffer(8), hash: 'mockhash', hashChanged: false, bookmarks: [] }),
        getBookmarks: () => Promise.resolve({ success: true, bookmarks: [] }),
        addBookmark: () => Promise.resolve({ success: true }),
        openPdfDialog: () => Promise.resolve('test.pdf'),
        removeRecentPdf: (pdfPath) => {
          mockRecentPdfs = mockRecentPdfs.filter(pdf => pdf.path !== pdfPath);
          return Promise.resolve({ success: true });
        },
        forgetPdf: () => Promise.resolve({ success: true }),
        deletePdf: () => Promise.resolve({ success: true }),
      };
    }
  });
});