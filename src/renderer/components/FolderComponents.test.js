const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');

// Mock globals
global.window = global.window || {};
global.window.electronAPI = {
  loadFolders: jest.fn(),
  createFolder: jest.fn(),
  updateFolder: jest.fn(),
  deleteFolder: jest.fn(),
  assignPdfToFolder: jest.fn(),
  unassignPdfFromFolder: jest.fn()
};
global.React = React;

// Load actual components
require('./FolderTree.js');
require('./TruncatedText.js');
require('./OrphanPdfList.js');
require('./RecentPdfList.js');
require('./HomeScreen.js');

describe('Folder Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FolderTree Component', () => {
    test('Component can be instantiated without syntax errors', () => {
      expect(typeof window.FolderTree).toBe('function');
    });

    test('Renders with empty folders', () => {
      const mockProps = {
        folders: {},
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand: jest.fn()
      };

      expect(() => {
        render(React.createElement(window.FolderTree, mockProps));
      }).not.toThrow();
    });

    test('Renders with folders', () => {
      const mockFolders = {
        'folder1': {
          name: 'Test Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf']
        }
      };

      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      expect(screen.getByText('Test Folder')).toBeInTheDocument();
      expect(screen.getByText('(1)')).toBeInTheDocument(); // PDF count
    });

    test('Click on folder line toggles expansion for folders with children', () => {
      const mockFolders = {
        'parent': {
          name: 'Parent Folder',
          parentId: null,
          childrenIds: ['child'],
          pdfPaths: []
        },
        'child': {
          name: 'Child Folder',
          parentId: 'parent',
          childrenIds: [],
          pdfPaths: []
        }
      };

      const onToggleExpand = jest.fn();
      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Cliquer sur la ligne du dossier parent (qui a des enfants)
      const parentFolderLine = screen.getByText('Parent Folder').closest('.folder-header');
      fireEvent.click(parentFolderLine);

      expect(onToggleExpand).toHaveBeenCalledWith('parent');
    });

    test('Click on folder line does not toggle for folders without children and without PDFs', () => {
      const mockFolders = {
        'folder1': {
          name: 'Leaf Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: []
        }
      };

      const onToggleExpand = jest.fn();
      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Cliquer sur la ligne du dossier sans enfants
      const leafFolderLine = screen.getByText('Leaf Folder').closest('.folder-header');
      fireEvent.click(leafFolderLine);

      // Ne doit pas déclencher onToggleExpand pour un dossier sans enfants
      expect(onToggleExpand).not.toHaveBeenCalled();
    });

    test('Click on folder line toggles expansion for folders with only PDFs (no children)', () => {
      const mockFolders = {
        'pdfOnly': {
          name: 'PDF Only Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/doc1.pdf', '/doc2.pdf']
        }
      };

      const onToggleExpand = jest.fn();
      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Vérifier que le dossier a bien la classe expandable
      const folderHeader = screen.getByText('PDF Only Folder').closest('.folder-header');
      expect(folderHeader).toHaveClass('expandable');

      // Vérifier que l'icône d'expansion est présente
      const expandIcon = folderHeader.querySelector('.expand-icon');
      expect(expandIcon).toBeInTheDocument();

      // Cliquer sur la ligne du dossier avec PDFs seulement
      fireEvent.click(folderHeader);

      // Doit déclencher onToggleExpand
      expect(onToggleExpand).toHaveBeenCalledWith('pdfOnly');
    });

    test('Click on expand icon triggers toggle and does not propagate', () => {
      const mockFolders = {
        'parent': {
          name: 'Parent Folder',
          parentId: null,
          childrenIds: ['child'],
          pdfPaths: []
        },
        'child': {
          name: 'Child Folder',
          parentId: 'parent',
          childrenIds: [],
          pdfPaths: []
        }
      };

      const onToggleExpand = jest.fn();
      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Cliquer spécifiquement sur l'icône expand
      const expandIcon = document.querySelector('.expand-icon');
      fireEvent.click(expandIcon);

      // Doit déclencher une seule fois (pas de double appel avec la ligne)
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
      expect(onToggleExpand).toHaveBeenCalledWith('parent');
    });

    test('Click "+ Nouveau dossier" opens modal with empty input', () => {
      const mockProps = {
        folders: {},
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Cliquer sur le bouton "+ Nouveau dossier"
      const createButton = screen.getByText('+ Nouveau dossier');
      fireEvent.click(createButton);

      // Vérifier que la modale s'ouvre
      expect(screen.getByText('Nom du nouveau dossier racine:')).toBeInTheDocument();

      // Vérifier que l'input est vide
      const input = document.querySelector('input[type="text"]');
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('');
    });

    test('Opening multiple modals resets input each time', () => {
      const mockFolders = {
        'folder1': {
          name: 'Test Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: []
        }
      };

      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Première ouverture : bouton "+ Nouveau dossier"
      const createButton = screen.getByText('+ Nouveau dossier');
      fireEvent.click(createButton);

      let input = document.querySelector('input[type="text"]');
      expect(input.value).toBe('');

      // Fermer la modale
      fireEvent.click(screen.getByText('Annuler'));

      // Ouvrir le menu contextuel et créer un sous-dossier
      const folderHeader = screen.getByText('Test Folder').closest('.folder-header');
      fireEvent.contextMenu(folderHeader);

      fireEvent.click(screen.getByText('Créer sous-dossier'));

      // Vérifier que l'input est vide pour le sous-dossier
      input = document.querySelector('input[type="text"]');
      expect(input.value).toBe('');

      // Fermer la modale
      fireEvent.click(screen.getByText('Annuler'));

      // Ouvrir à nouveau "+ Nouveau dossier"
      fireEvent.click(createButton);

      // Vérifier que l'input est encore vide
      input = document.querySelector('input[type="text"]');
      expect(input.value).toBe('');
    });

    test('Input resets after typing and canceling modal', () => {
      const mockProps = {
        folders: {},
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        expandedFolders: new Set(),
        onToggleExpand: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Ouvrir la modale
      const createButton = screen.getByText('+ Nouveau dossier');
      fireEvent.click(createButton);

      // Taper du texte dans l'input
      let input = document.querySelector('input[type="text"]');
      fireEvent.change(input, { target: { value: 'Mon dossier test' } });
      expect(input.value).toBe('Mon dossier test');

      // Fermer la modale via "Annuler"
      fireEvent.click(screen.getByText('Annuler'));

      // Réouvrir la modale
      fireEvent.click(createButton);

      // L'input doit être vide (réinitialisé)
      input = document.querySelector('input[type="text"]');
      expect(input.value).toBe('');
    });
  });

  describe('OrphanPdfList Component', () => {
    test('Component can be instantiated without syntax errors', () => {
      expect(typeof window.OrphanPdfList).toBe('function');
    });

    test('Renders with orphan PDFs (string format)', () => {
      const mockProps = {
        orphanPdfs: ['/test1.pdf', '/test2.pdf'],
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.OrphanPdfList, mockProps));

      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
      expect(screen.getByText('test2.pdf')).toBeInTheDocument();
    });

    test('Renders with orphan PDFs (object format from IPC)', () => {
      const mockProps = {
        orphanPdfs: [
          { path: '/home/user/docs/test1.pdf', name: 'test1.pdf', exists: true },
          { path: '/home/user/docs/test2.pdf', name: 'test2.pdf', exists: true }
        ],
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.OrphanPdfList, mockProps));

      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
      expect(screen.getByText('test2.pdf')).toBeInTheDocument();
    });

    test('Renders empty state', () => {
      const mockProps = {
        orphanPdfs: [],
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.OrphanPdfList, mockProps));

      expect(screen.getByText('Aucun PDF orphelin')).toBeInTheDocument();
    });
  });

  describe('RecentPdfList Component', () => {
    test('Component can be instantiated without syntax errors', () => {
      expect(typeof window.RecentPdfList).toBe('function');
    });

    test('Renders with recent PDFs', () => {
      const mockProps = {
        recentPdfs: [
          { path: '/test1.pdf', exists: true },
          { path: '/test2.pdf', exists: false }
        ],
        onOpenPdf: jest.fn(),
        onRemovePdf: jest.fn()
      };

      render(React.createElement(window.RecentPdfList, mockProps));

      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
      expect(screen.getByText('test2.pdf')).toBeInTheDocument();
    });
  });

  describe('HomeScreen Component', () => {
    test('Component can be instantiated without syntax errors', () => {
      expect(typeof window.HomeScreen).toBe('function');
    });

    test('Renders 3-column layout', () => {
      const mockProps = {
        config: { recentPdfs: ['/test.pdf'] },
        folders: {},
        expandedFolders: new Set(),
        onOpenPdf: jest.fn(),
        onOpenDialog: jest.fn(),
        onRemovePdf: jest.fn(),
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        onUnassignPdf: jest.fn(),
        onToggleExpand: jest.fn()
      };

      render(React.createElement(window.HomeScreen, mockProps));

      expect(screen.getByText('📄 PDF Viewer')).toBeInTheDocument();
      expect(screen.getByText('Dossiers')).toBeInTheDocument();
      expect(screen.getByText('PDFs orphelins')).toBeInTheDocument();
      expect(screen.getByText('PDFs récents')).toBeInTheDocument();
    });
  });

  describe('PDF Context Menu in FolderTree', () => {
    test('Right-click on PDF shows context menu', () => {
      const mockFolders = {
        'folder1': {
          name: 'Test Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf']
        }
      };

      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        onUnassignPdf: jest.fn(),
        expandedFolders: new Set(['folder1']),
        onToggleExpand: jest.fn(),
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Find the PDF item and right-click
      const pdfItem = screen.getByText('test.pdf').closest('.folder-pdf-item');
      fireEvent.contextMenu(pdfItem);

      // Verify context menu options are displayed
      expect(screen.getByText('Ajouter à un autre dossier')).toBeInTheDocument();
      expect(screen.getByText('Retirer du dossier')).toBeInTheDocument();
    });

    test('Click "Retirer du dossier" calls onUnassignPdf', () => {
      const mockFolders = {
        'folder1': {
          name: 'Test Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf']
        }
      };

      const onUnassignPdf = jest.fn();
      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        onUnassignPdf,
        expandedFolders: new Set(['folder1']),
        onToggleExpand: jest.fn(),
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Right-click on PDF
      const pdfItem = screen.getByText('test.pdf').closest('.folder-pdf-item');
      fireEvent.contextMenu(pdfItem);

      // Click "Retirer du dossier"
      fireEvent.click(screen.getByText('Retirer du dossier'));

      expect(onUnassignPdf).toHaveBeenCalledWith('folder1', '/test.pdf');
    });

    test('Click "Ajouter à un autre dossier" shows folder selection modal', () => {
      const mockFolders = {
        'folder1': {
          name: 'Test Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf']
        },
        'folder2': {
          name: 'Other Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: []
        }
      };

      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        onUnassignPdf: jest.fn(),
        expandedFolders: new Set(['folder1']),
        onToggleExpand: jest.fn(),
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Right-click on PDF
      const pdfItem = screen.getByText('test.pdf').closest('.folder-pdf-item');
      fireEvent.contextMenu(pdfItem);

      // Click "Ajouter à un autre dossier"
      fireEvent.click(screen.getByText('Ajouter à un autre dossier'));

      // Verify folder selection modal appears
      expect(screen.getByText('Sélectionner un dossier')).toBeInTheDocument();
      // Only folders NOT containing the PDF should be shown in the modal
      const modal = document.querySelector('.folder-select-modal');
      expect(modal).toBeInTheDocument();
      const folderSelectItem = modal.querySelector('.folder-select-name');
      expect(folderSelectItem.textContent).toBe('Other Folder');
    });

    test('Folder selection modal excludes current folders', () => {
      const mockFolders = {
        'folder1': {
          name: 'Folder A',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf']
        },
        'folder2': {
          name: 'Folder B',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf'] // Also contains the PDF
        },
        'folder3': {
          name: 'Folder C',
          parentId: null,
          childrenIds: [],
          pdfPaths: [] // Does not contain the PDF
        }
      };

      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf: jest.fn(),
        onUnassignPdf: jest.fn(),
        expandedFolders: new Set(['folder1']),
        onToggleExpand: jest.fn(),
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Right-click on PDF in folder1
      const pdfItem = screen.getByText('test.pdf').closest('.folder-pdf-item');
      fireEvent.contextMenu(pdfItem);

      // Click "Ajouter à un autre dossier"
      fireEvent.click(screen.getByText('Ajouter à un autre dossier'));

      // Only Folder C should be in the selection list (inside modal)
      const modal = document.querySelector('.folder-select-modal');
      const folderSelectNames = modal.querySelectorAll('.folder-select-name');
      
      // Should only have one folder in the list
      expect(folderSelectNames.length).toBe(1);
      expect(folderSelectNames[0].textContent).toBe('Folder C');
    });

    test('Selecting folder in modal calls onAssignPdf', () => {
      const mockFolders = {
        'folder1': {
          name: 'Test Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: ['/test.pdf']
        },
        'folder2': {
          name: 'Other Folder',
          parentId: null,
          childrenIds: [],
          pdfPaths: []
        }
      };

      const onAssignPdf = jest.fn();
      const mockProps = {
        folders: mockFolders,
        onCreateFolder: jest.fn(),
        onUpdateFolder: jest.fn(),
        onDeleteFolder: jest.fn(),
        onAssignPdf,
        onUnassignPdf: jest.fn(),
        expandedFolders: new Set(['folder1']),
        onToggleExpand: jest.fn(),
        onOpenPdf: jest.fn()
      };

      render(React.createElement(window.FolderTree, mockProps));

      // Right-click on PDF
      const pdfItem = screen.getByText('test.pdf').closest('.folder-pdf-item');
      fireEvent.contextMenu(pdfItem);

      // Click "Ajouter à un autre dossier"
      fireEvent.click(screen.getByText('Ajouter à un autre dossier'));

      // Select folder in modal (click on the folder-select-item)
      const modal = document.querySelector('.folder-select-modal');
      const folderSelectItem = modal.querySelector('.folder-select-item');
      fireEvent.click(folderSelectItem);

      expect(onAssignPdf).toHaveBeenCalledWith('folder2', '/test.pdf');
    });
  });
});
