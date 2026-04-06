import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search } from "lucide-react";

const SearchableDropdown = ({
  label,
  placeholder,
  value,
  onChange,
  fetchOptions,
  displayKey = "label",
  valueKey = "value", // Added valueKey prop
  debounceDelay = 300,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const dropdownRef = useRef();
  const inputRef = useRef();
  const debounceTimeoutRef = useRef(null);

  // Debounced fetch function
  const debouncedFetch = useCallback((searchTerm) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchOptions(searchTerm);
        setOptions(data || []);
      } catch (error) {
        console.error("Error fetching options:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceDelay);
  }, [fetchOptions, debounceDelay]);

  // Fetch options when search changes
  useEffect(() => {
    if (open) {
      debouncedFetch(search);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [search, open, debouncedFetch]);

  // Find and set selected label when value changes
  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }

    // If options are loaded, find the matching label
    if (options.length > 0) {
      const selectedOption = options.find(opt => 
        String(opt[valueKey]) === String(value)
      );
      if (selectedOption) {
        setSelectedLabel(selectedOption[displayKey]);
      }
    } else if (value && typeof value === 'string') {
      // If value is a string, use it as label temporarily
      setSelectedLabel(value);
    }
  }, [value, options, displayKey, valueKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSelect = useCallback((option) => {
    // Pass the value based on valueKey
    const selectedValue = option[valueKey];
    onChange(selectedValue);
    setSelectedLabel(option[displayKey]);
    setOpen(false);
    setSearch("");
  }, [onChange, displayKey, valueKey]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleDropdownToggle = () => {
    setOpen(!open);
    if (!open) {
      setSearch("");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1 block">
          {label}
        </label>
      )}

      <div
        className="border rounded-md px-3 py-2 text-xs flex justify-between items-center cursor-pointer bg-white hover:border-gray-400 transition-colors"
        onClick={handleDropdownToggle}
      >
        <span className={`truncate ${selectedLabel ? 'text-gray-900' : 'text-gray-500'}`}>
          {selectedLabel || placeholder || "Select an option"}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="flex items-center px-3 border-b">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type to search..."
              value={search}
              onChange={handleSearchChange}
              className="w-full px-2 py-2 text-xs outline-none bg-transparent"
            />
            {loading && (
              <div className="ml-2">
                <div className="h-3 w-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="overflow-y-auto max-h-48">
            {loading && options.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">Loading...</p>
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 text-center">
                {search ? "No results found" : "Type to search"}
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option._id || option[valueKey] || option[displayKey]}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer truncate ${
                    selectedLabel === option[displayKey] ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                  title={option[displayKey]}
                >
                  {option[displayKey]}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;