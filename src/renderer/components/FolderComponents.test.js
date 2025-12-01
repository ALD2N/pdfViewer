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
        onToggleExpand: jest.fn()
      };

      render(React.createElement(window.HomeScreen, mockProps));

      expect(screen.getByText('📄 PDF Viewer')).toBeInTheDocument();
      expect(screen.getByText('Dossiers')).toBeInTheDocument();
      expect(screen.getByText('PDFs orphelins')).toBeInTheDocument();
      expect(screen.getByText('PDFs récents')).toBeInTheDocument();
    });
  });
});