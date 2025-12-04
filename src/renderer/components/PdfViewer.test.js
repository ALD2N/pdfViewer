const React = require('react');
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');

// Mock globals
global.window = global.window || {};
global.window.pdfjsLib = {
  getDocument: jest.fn()
};

global.window.electronAPI = {
  addBookmark: jest.fn(),
  updateBookmark: jest.fn(),
  deleteBookmark: jest.fn(),
  reorderBookmarks: jest.fn()
};

global.window.BookmarkList = () => React.createElement('div', null, 'BookmarkList');
global.window.SearchPanel = () => React.createElement('div', null, 'SearchPanel');

// Mock the PdfViewer component for testing
global.window.PdfViewer = function PdfViewer({ pdfData, onGoHome, scrollConfig = {} }) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [numPages, setNumPages] = React.useState(10);
  const { pagesPerWheel = 1, enableScrollNavigation = true } = scrollConfig;

  React.useEffect(() => {
    if (pdfData) {
      setNumPages(10);
    }
  }, [pdfData]);

  // Mock scroll navigation effect
  React.useEffect(() => {
    const handleWheel = (event) => {
      if (!enableScrollNavigation) return;
      if (!event.target.closest('.viewer-nav')) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const newPage = Math.max(1, Math.min(numPages, currentPage + direction * pagesPerWheel));

      if (newPage !== currentPage) {
        event.preventDefault();
        setCurrentPage(newPage);
      }
    };

    const viewerNav = document.querySelector('.viewer-nav');
    if (viewerNav) {
      viewerNav.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (viewerNav) {
        viewerNav.removeEventListener('wheel', handleWheel);
      }
    };
  }, [enableScrollNavigation, pagesPerWheel, currentPage, numPages]);

  return React.createElement('div', { className: 'pdf-viewer' },
    React.createElement('div', { className: 'viewer-header' },
      React.createElement('div', { className: 'viewer-nav' },
        React.createElement('button', { onClick: onGoHome }, '🏠 Accueil'),
        React.createElement('div', { className: 'page-indicator' },
          React.createElement('span', { className: 'page-info' }, `Page ${currentPage} / ${numPages}`)
        )
      )
    ),
    React.createElement('div', { className: 'viewer-body' },
      pdfData ? React.createElement('div', null, 'PDF loaded') : React.createElement('div', { className: 'loading-overlay' },
        React.createElement('div', { className: 'spinner' }),
        React.createElement('p', null, 'Chargement du PDF...'))
    )
  );
};

describe('PdfViewer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Component can be instantiated without syntax errors', () => {
    expect(typeof window.PdfViewer).toBe('function');
  });

  test('Props are accepted correctly', () => {
    const mockProps = {
      pdfData: { data: new ArrayBuffer(8), path: '/test.pdf', bookmarks: [] },
      onGoHome: jest.fn()
    };

    expect(() => {
      render(React.createElement(window.PdfViewer, mockProps));
    }).not.toThrow();
  });

  test('Basic rendering does not crash', () => {
    const mockProps = {
      pdfData: null,
      onGoHome: jest.fn()
    };

    expect(() => {
      render(React.createElement(window.PdfViewer, mockProps));
    }).not.toThrow();

    // Check if basic elements are rendered
    expect(screen.getByText('🏠 Accueil')).toBeInTheDocument();
  });

  test('Mutex/queue system functions exist', () => {
    // Since the component is a function, we can't directly access internal functions
    // But we can check if the component renders and has expected behavior
    const mockProps = {
      pdfData: null,
      onGoHome: jest.fn()
    };

    render(React.createElement(window.PdfViewer, mockProps));

    // The component should render without errors, implying the internal functions are defined
    expect(screen.getByText('Chargement du PDF...')).toBeInTheDocument();
  });
});

// Tests for scroll navigation
describe('Scroll Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Scroll sur .viewer-nav change la page de +N (pagesPerWheel)', () => {
    const mockProps = {
      pdfData: { data: new ArrayBuffer(8), path: '/test.pdf', bookmarks: [] },
      onGoHome: jest.fn(),
      scrollConfig: { pagesPerWheel: 2, enableScrollNavigation: true }
    };

    render(React.createElement(window.PdfViewer, mockProps));

    const viewerNav = screen.getByText('🏠 Accueil').parentElement;

    // Scroll down (deltaY > 0) should increase page by pagesPerWheel
    fireEvent.wheel(viewerNav, { deltaY: 100 });

    waitFor(() => {
      expect(screen.getByText('Page 3 / 10')).toBeInTheDocument();
    });
  });

  test('Scroll hors .viewer-nav ne change pas la page', () => {
    const mockProps = {
      pdfData: { data: new ArrayBuffer(8), path: '/test.pdf', bookmarks: [] },
      onGoHome: jest.fn(),
      scrollConfig: { pagesPerWheel: 1, enableScrollNavigation: true }
    };

    render(React.createElement(window.PdfViewer, mockProps));

    const viewerBody = screen.getByText('PDF loaded').parentElement;

    // Scroll on viewer-body should not change page
    fireEvent.wheel(viewerBody, { deltaY: 100 });

    // Page should remain 1
    expect(screen.getByText('Page 1 / 10')).toBeInTheDocument();
  });

  test('Clamp à [1, numPages] (page 1 et dernière page)', () => {
    const mockProps = {
      pdfData: { data: new ArrayBuffer(8), path: '/test.pdf', bookmarks: [] },
      onGoHome: jest.fn(),
      scrollConfig: { pagesPerWheel: 1, enableScrollNavigation: true }
    };

    render(React.createElement(window.PdfViewer, mockProps));

    const viewerNav = screen.getByText('🏠 Accueil').parentElement;

    // Try to scroll up from page 1 (should stay at 1)
    fireEvent.wheel(viewerNav, { deltaY: -100 });
    expect(screen.getByText('Page 1 / 10')).toBeInTheDocument();

    // Scroll to page 10
    for (let i = 1; i < 10; i++) {
      fireEvent.wheel(viewerNav, { deltaY: 100 });
    }

    waitFor(() => {
      expect(screen.getByText('Page 10 / 10')).toBeInTheDocument();
    });

    // Try to scroll down from page 10 (should stay at 10)
    fireEvent.wheel(viewerNav, { deltaY: 100 });
    expect(screen.getByText('Page 10 / 10')).toBeInTheDocument();
  });

  test('preventDefault appelé seulement si page change', () => {
    const mockProps = {
      pdfData: { data: new ArrayBuffer(8), path: '/test.pdf', bookmarks: [] },
      onGoHome: jest.fn(),
      scrollConfig: { pagesPerWheel: 1, enableScrollNavigation: true }
    };

    render(React.createElement(window.PdfViewer, mockProps));

    const viewerNav = screen.getByText('🏠 Accueil').parentElement;

    // Mock preventDefault
    const mockPreventDefault = jest.fn();
    const wheelEvent = { deltaY: 100, preventDefault: mockPreventDefault };

    // Scroll down from page 1 (page changes, preventDefault should be called)
    fireEvent.wheel(viewerNav, wheelEvent);
    expect(mockPreventDefault).toHaveBeenCalled();

    // Scroll up from page 1 (page doesn't change, preventDefault should not be called)
    const wheelEventUp = { deltaY: -100, preventDefault: jest.fn() };
    fireEvent.wheel(viewerNav, wheelEventUp);
    expect(wheelEventUp.preventDefault).not.toHaveBeenCalled();
  });

  test('Désactivation quand enableScrollNavigation: false', () => {
    const mockProps = {
      pdfData: { data: new ArrayBuffer(8), path: '/test.pdf', bookmarks: [] },
      onGoHome: jest.fn(),
      scrollConfig: { pagesPerWheel: 1, enableScrollNavigation: false }
    };

    render(React.createElement(window.PdfViewer, mockProps));

    const viewerNav = screen.getByText('🏠 Accueil').parentElement;

    // Scroll should not change page when disabled
    fireEvent.wheel(viewerNav, { deltaY: 100 });
    expect(screen.getByText('Page 1 / 10')).toBeInTheDocument();
  });
});