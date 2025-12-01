/**
 * TruncatedText.js - Affiche un texte tronqué avec tooltip conditionnel
 */

(function() {
  const { useState, useRef, useLayoutEffect, useCallback, useEffect } = React;

  function TruncatedText({ text = '', className, as = 'div', ...rest }) {
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef(null);

    const checkTruncation = useCallback(() => {
      const el = textRef.current;
      if (!el) return;

      const truncated = el.scrollWidth > el.clientWidth;
      setIsTruncated(prev => prev !== truncated ? truncated : prev);
    }, []);

    useLayoutEffect(() => {
      checkTruncation();
    }, [text, checkTruncation]);

    useEffect(() => {
      const handleResize = () => checkTruncation();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [checkTruncation]);

    const combinedClassName = [rest.className, className]
      .filter(Boolean)
      .join(' ') || undefined;

    const elementProps = {
      ...rest,
      className: combinedClassName,
      ref: textRef,
      title: isTruncated ? text : undefined
    };

    return React.createElement(as, elementProps, text);
  }

  window.TruncatedText = TruncatedText;
})();
