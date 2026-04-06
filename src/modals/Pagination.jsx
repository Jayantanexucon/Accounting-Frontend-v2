import { ChevronLeft } from "lucide-react";
import { ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
      >
        <ChevronLeft size={18} />
      </button>

      {pages
        .filter((page, index) => pages.indexOf(page) === index)
        .map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={typeof page !== "number"}
            className={`px-3 py-2 rounded-lg border ${currentPage === page ? "bg-neutral-800 text-white border-neutral-800" : "border-neutral-300 hover:bg-neutral-50"} disabled:cursor-default`}
          >
            {page}
          </button>
        ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
