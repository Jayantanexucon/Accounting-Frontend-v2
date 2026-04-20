import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const AccountSearchDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select account...",
  onAddNew
}) => {
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputDisplay, setInputDisplay] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update displayed name when value or options change
  useEffect(() => {
    const account = options.find(acc => acc._id === value);
    setInputDisplay(account ? account.name : '');
    setSearchText('');
  }, [value, options]);

  // Filter options
  const filteredOptions = options.filter(acc =>
    acc.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (acc.groupName && acc.groupName.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideWrapper = wrapperRef.current?.contains(event.target);
      const clickedInsideDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedInsideWrapper && !clickedInsideDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate position when dropdown opens or on scroll/resize
  useLayoutEffect(() => {
    if (!showDropdown || !inputRef.current) return;

    const updatePosition = () => {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown]);

  const handleInputChange = (e) => {
    setSearchText(e.target.value);
    setInputDisplay(e.target.value);
    setShowDropdown(true);
  };

  const handleInputFocus = () => {
    setSearchText('');
    setShowDropdown(true);
  };

  const handleOptionClick = (account) => {
    setInputDisplay(account.name);
    setSearchText('');
    setShowDropdown(false);
    onChange(account._id);
  };

  const handleAddNewClick = () => {
    setShowDropdown(false);
    if (onAddNew) onAddNew();
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchText !== '' ? searchText : inputDisplay}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 bg-white"
        autoComplete="off"
      />
      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[99999] bg-white border rounded-lg shadow-2xl max-h-60 overflow-y-auto"
            style={dropdownStyle}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((acc) => (
                <div
                  key={acc._id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleOptionClick(acc)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {acc.name}{' '}
                  {acc.groupName && (
                    <span className="text-gray-500 text-xs">({acc.groupName})</span>
                  )}
                </div>
              ))
            ) : (
              <div
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer"
                onClick={handleAddNewClick}
                onMouseDown={(e) => e.preventDefault()}
              >
                No results found.{' '}
                <span className="text-blue-600 underline">Add new ledger</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default AccountSearchDropdown;
