export default function EmptyComponent({ title, subtitle }) {
  return (
    <div className="w-full bg-white border border-neutral-200 rounded-lg flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex flex-col items-center gap-3 max-w-md">
        <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-semibold text-neutral-800">{title}</p>
          <p className="text-sm text-neutral-500 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
