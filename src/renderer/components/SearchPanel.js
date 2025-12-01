/**
 * SearchPanel.js - Composant d'interface de recherche textuelle
 * Permet de saisir un terme, lancer la recherche et afficher les résultats
 * Supporte la navigation vers les résultats avec surlignage
 */

(function() {
  const { useState, useCallback, useRef } = React;

  function SearchPanel({ onSearch, onNavigateToResult, results, isSearching }) {
    const [query, setQuery] = useState('');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const inputRef = useRef(null);

    // Gestionnaire de soumission de recherche
    const handleSubmit = useCallback((e) => {
      e.preventDefault();
      if (query.trim() && !isSearching) {
        onSearch(query.trim(), (current, total) => {
          setProgress({ current, total });
        });
      }
    }, [query, isSearching, onSearch]);

    // Gestionnaire de changement de l'input
    const handleInputChange = useCallback((e) => {
      setQuery(e.target.value);
    }, []);

    // Gestionnaire de touche Enter
    const handleKeyDown = useCallback((e) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
    }, [handleSubmit]);

    // Gestionnaire de clic sur un résultat
    const handleResultClick = useCallback((result) => {
      onNavigateToResult(result);
    }, [onNavigateToResult]);

    // Effacer les résultats
    const handleClear = useCallback(() => {
      setQuery('');
      setProgress({ current: 0, total: 0 });
      // onSearch avec query vide pour effacer
      onSearch('', () => {});
    }, [onSearch]);

    return React.createElement('div', { className: 'search-section' },
      // Barre de recherche
      React.createElement('div', { className: 'search-bar' },
        React.createElement('form', { className: 'search-form', onSubmit: handleSubmit },
          React.createElement('input', {
            ref: inputRef,
            type: 'text',
            className: 'search-input',
            placeholder: 'Rechercher dans le PDF...',
            value: query,
            onChange: handleInputChange,
            onKeyDown: handleKeyDown,
            disabled: isSearching
          }),
          React.createElement('div', { className: 'search-nav' },
            React.createElement('button', {
              type: 'submit',
              className: 'btn-primary',
              disabled: !query.trim() || isSearching,
              title: 'Lancer la recherche'
            }, isSearching ? '⏳' : '🔍'),
            React.createElement('button', {
              type: 'button',
              className: 'btn-secondary',
              onClick: handleClear,
              disabled: isSearching,
              title: 'Effacer'
            }, '✕')
          )
        )
      ),

      // Indicateur de progression
      isSearching && progress.total > 0 && React.createElement('div', { className: 'search-progress' },
        React.createElement('div', { className: 'progress-text' },
          `Recherche en cours... Page ${progress.current} / ${progress.total}`
        ),
        React.createElement('div', { className: 'progress-bar' },
          React.createElement('div', {
            className: 'progress-fill',
            style: { width: `${(progress.current / progress.total) * 100}%` }
          })
        )
      ),

      // Résultats
      React.createElement('div', { className: 'search-results' },
        results.length > 0
          ? React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'results-header' },
                `Résultats (${results.length})`
              ),
               React.createElement('div', { className: 'results-list' },
                 results.map((result, index) =>
                   React.createElement('div', {
                     key: `page-${result.page}`,
                     className: 'search-result-item',
                     onClick: () => handleResultClick(result)
                   },
                     React.createElement('div', { className: 'search-result-page' },
                       React.createElement('span', { className: 'page-label' }, 'Page'),
                       React.createElement('span', { className: 'page-number' }, result.page)
                     ),
                     React.createElement('div', { className: 'search-result-info' },
                       React.createElement('div', { className: 'result-count' }, `${result.count} occurrence${result.count > 1 ? 's' : ''}`)
                     ),
                     React.createElement('div', { className: 'search-result-action' }, '➜')
                   )
                 )
               )
            )
          : !isSearching && query && React.createElement('div', { className: 'no-results' },
              'Aucun résultat trouvé'
            )
      )
    );
  }

  // Exposer globalement
  window.SearchPanel = SearchPanel;
})();
