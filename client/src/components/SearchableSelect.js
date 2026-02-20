import React, { useState, useRef, useEffect } from 'react';

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '-- Chọn --',
  formatOption,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Normalize Vietnamese characters for search (remove diacritics)
  const normalizeVietnamese = (str) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Filter options based on search term (case insensitive + Vietnamese diacritics)
  const filteredOptions = options.filter(opt => {
    if (!searchTerm) return true;
    const labelNormalized = normalizeVietnamese(opt.label);
    const searchNormalized = normalizeVietnamese(searchTerm);
    // Also check original lowercase for exact matches
    const labelLower = opt.label.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return labelNormalized.includes(searchNormalized) || labelLower.includes(searchLower);
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      className="searchable-select"
      style={{ position: 'relative' }}
    >
      {/* Display selected value or placeholder */}
      <div
        className={`searchable-select-display ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="searchable-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="searchable-select-icons">
          {value && !disabled && (
            <span className="searchable-select-clear" onClick={handleClear}>✕</span>
          )}
          <span className="searchable-select-arrow">{isOpen ? '▲' : '▼'}</span>
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="searchable-select-dropdown">
          {/* Search input */}
          <div className="searchable-select-search">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          {/* Options list */}
          <div className="searchable-select-options">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-no-results">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`searchable-select-option ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {formatOption ? formatOption(opt) : opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
