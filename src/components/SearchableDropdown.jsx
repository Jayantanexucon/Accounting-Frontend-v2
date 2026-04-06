import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export default function SearchableDropdown({ value, onChange, options = [], placeholder = "Select option...", label = "", error = "", disabled = false, noMatchJSX = <>No results found...</> }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef();
  const inputRef = useRef();
  const triggerRef = useRef();
  const dropdownRef = useRef();

  const filtered = options.filter((opt) => opt.name?.toLowerCase().includes(search.toLowerCase()) || opt.code?.toString().includes(search));

  useEffect(() => {
    function handler(e) {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && triggerRef.current) {
      // Get trigger position
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      // Calculate available space
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Estimate dropdown height (approx 300px max)
      const estimatedHeight = Math.min(filtered.length * 40 + 70, 300);

      let top;

      // Open above if not enough space below AND more space above
      if (spaceBelow < estimatedHeight && spaceAbove > estimatedHeight) {
        // Open above the trigger
        top = rect.top + scrollTop - estimatedHeight - 4;
      } else {
        // Open below the trigger
        top = rect.bottom + scrollTop + 4;
      }

      setDropdownPosition({
        top: Math.max(4, top), // Ensure it doesn't go above viewport
        left: rect.left + scrollLeft,
        width: rect.width,
        maxHeight: Math.min(spaceBelow, spaceAbove, 300), // Dynamic max height
      });
    }
  }, [open, filtered.length]);

  useEffect(() => {
    if (open && dropdownRef.current) {
      // Adjust position if dropdown goes out of viewport
      const dropdownRect = dropdownRef.current.getBoundingClientRect();

      if (dropdownRect.bottom > window.innerHeight) {
        const overflow = dropdownRect.bottom - window.innerHeight;
        setDropdownPosition((prev) => ({
          ...prev,
          top: prev.top - overflow - 10,
        }));
      }

      if (dropdownRect.right > window.innerWidth) {
        setDropdownPosition((prev) => ({
          ...prev,
          left: window.innerWidth - prev.width - 10,
        }));
      }
    }
  }, [open]);

  const selected = options.find((o) => o._id === value);

  const handleSelect = (opt) => {
    onChange(opt._id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  };

  return (
    <div ref={containerRef} className="w-full relative">
      {label && <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>}

      <div className="relative">
        <div
          ref={triggerRef}
          className={`
            relative flex items-center gap-2 w-full px-3 py-2.5 
            text-sm bg-white border rounded-lg
            transition-all duration-200
            ${disabled ? "bg-neutral-50 cursor-not-allowed opacity-60" : "cursor-pointer hover:border-neutral-400"}
            ${open ? "border-neutral-900 ring-2 ring-neutral-900 ring-opacity-20" : error ? "border-red-500" : "border-neutral-300"}
          `}
          onClick={() => !disabled && setOpen(!open)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
        >
          <div className="flex-1 truncate text-left">
            {selected ? (
              <span className="text-neutral-900">
                <span className="font-medium text-neutral-500">{selected.code?.toString().padStart(3, "0") || "000"}</span>
                {" - "}
                {selected.name}
              </span>
            ) : (
              <span className="text-neutral-400">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {selected && !disabled && (
              <button onClick={handleClear} className="p-0.5 hover:bg-neutral-100 rounded transition-colors" tabIndex={-1}>
                <X size={16} className="text-neutral-500" />
              </button>
            )}
            <ChevronDown size={18} className={`text-neutral-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </div>
        </div>

        {open && (
          <div
            ref={dropdownRef}
            className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg z-[9999] overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: dropdownPosition.maxHeight ? `${dropdownPosition.maxHeight}px` : "300px",
            }}
          >
            {/* Search Input */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 z-10">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={inputRef}
                className="w-full pl-10 pr-3 py-3 text-sm outline-none text-neutral-900 placeholder:text-neutral-400 bg-white"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Options List */}
            <div className="overflow-y-auto" style={{ maxHeight: dropdownPosition.maxHeight ? `${dropdownPosition.maxHeight - 50}px` : "250px" }}>
              {filtered.length ? (
                filtered.map((opt, idx) => (
                  <div
                    key={opt._id}
                    className={`
                      px-3 py-2.5 text-sm cursor-pointer transition-colors
                      ${idx === highlightedIndex ? "bg-neutral-100" : "hover:bg-neutral-50"}
                      ${opt._id === value ? "bg-neutral-900 text-white hover:bg-neutral-800" : "text-neutral-900"}
                    `}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <span className={opt._id === value ? "font-medium text-neutral-300" : "font-medium text-neutral-500"}>{opt.code?.toString().padStart(3, "0") || "000"}</span>
                    {" - "}
                    {opt.name}
                  </div>
                ))
              ) : (
                <div className="px-3 py-8 text-sm text-neutral-400 text-center">{noMatchJSX}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
}
