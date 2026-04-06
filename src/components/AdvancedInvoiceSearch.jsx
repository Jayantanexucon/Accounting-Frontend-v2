// import React, { useState, useEffect } from "react";
// import { X } from "lucide-react";

// const AdvancedInvoiceSearch = ({
//   isOpen,
//   onClose,
//   onSearch,
//   invoiceNumbers = [],
//   clientNames = [],
// }) => {
//   const [filters, setFilters] = useState({
//     invoiceNo: "",
//     clientName: "",
//     paymentStatus: "",
//     journalPosted:"",
//   });

//   const [invoiceSearch, setInvoiceSearch] = useState("");
//   const [clientSearch, setClientSearch] = useState("");
//   const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
//   const [showClientDropdown, setShowClientDropdown] = useState(false);

//   const [dateTypes, setDateTypes] = useState({
//     invoiceDate: { selected: false, from: "", to: "" },
//     createdAt: { selected: false, from: "", to: "" },
//     salesJournalPostedAt: { selected: false, from: "", to: "" },
//   });

//   // Reset filters when modal opens
//   useEffect(() => {
//     if (isOpen) {
//       setFilters({
//         invoiceNo: "",
//         clientName: "",
//         paymentStatus: "",
//         journalPosted:"",
//       });
//       setInvoiceSearch("");
//       setClientSearch("");
//       setDateTypes({
//         invoiceDate: { selected: false, from: "", to: "" },
//         createdAt: { selected: false, from: "", to: "" },
//         salesJournalPostedAt: { selected: false, from: "", to: "" },
//       });
//     }
//   }, [isOpen]);

//   const handleChange = (e) => {
//     setFilters({ ...filters, [e.target.name]: e.target.value });
//   };

//   const handleDateTypeToggle = (dateType) => {
//     setDateTypes({
//       ...dateTypes,
//       [dateType]: {
//         ...dateTypes[dateType],
//         selected: !dateTypes[dateType].selected,
//       },
//     });
//   };

//   const handleDateChange = (dateType, field, value) => {
//     setDateTypes({
//       ...dateTypes,
//       [dateType]: {
//         ...dateTypes[dateType],
//         [field]: value,
//       },
//     });
//   };

//   const handleSearch = () => {
//     // Prepare date filters for selected date types
//     const dateFilters = {};

//     // Handle invoiceDate range - only add if selected AND has values
//     if (dateTypes.invoiceDate.selected) {
//       if (
//         dateTypes.invoiceDate.from &&
//         dateTypes.invoiceDate.from.trim() !== ""
//       ) {
//         dateFilters.invoiceDateFrom = dateTypes.invoiceDate.from;
//       }
//       if (dateTypes.invoiceDate.to && dateTypes.invoiceDate.to.trim() !== "") {
//         dateFilters.invoiceDateTo = dateTypes.invoiceDate.to;
//       }
//     }

//     // Handle createdAt range - only add if selected AND has values
//     if (dateTypes.createdAt.selected) {
//       if (dateTypes.createdAt.from && dateTypes.createdAt.from.trim() !== "") {
//         dateFilters.createdAtFrom = dateTypes.createdAt.from;
//       }
//       if (dateTypes.createdAt.to && dateTypes.createdAt.to.trim() !== "") {
//         dateFilters.createdAtTo = dateTypes.createdAt.to;
//       }
//     }

//     // Handle salesJournalPostedAt range - only add if selected AND has values
//     if (dateTypes.salesJournalPostedAt.selected) {
//       if (
//         dateTypes.salesJournalPostedAt.from &&
//         dateTypes.salesJournalPostedAt.from.trim() !== ""
//       ) {
//         dateFilters.salesJournalPostedAtFrom =
//           dateTypes.salesJournalPostedAt.from;
//       }
//       if (
//         dateTypes.salesJournalPostedAt.to &&
//         dateTypes.salesJournalPostedAt.to.trim() !== ""
//       ) {
//         dateFilters.salesJournalPostedAtTo = dateTypes.salesJournalPostedAt.to;
//       }
//     }

//     // Filter out empty values from filters
//     const activeFilters = Object.entries(filters).reduce(
//       (acc, [key, value]) => {
//         if (value && value.trim() !== "") {
//           acc[key] = value;
//         }
//         return acc;
//       },
//       {}
//     );

//     // Combine all filters
//     const finalFilters = { ...activeFilters, ...dateFilters };

//     console.log("Advanced Search Filters:", finalFilters); // For debugging
//     console.log("Date Types State:", dateTypes); // For debugging

//     onSearch(finalFilters);
//   };

//   const handleClear = () => {
//     setFilters({
//       invoiceNo: "",
//       clientName: "",
//       paymentStatus: "",
//       journalPosted:"",
//     });
//     setDateTypes({
//       invoiceDate: { selected: false, from: "", to: "" },
//       createdAt: { selected: false, from: "", to: "" },
//       salesJournalPostedAt: { selected: false, from: "", to: "" },
//     });
//     setInvoiceSearch("");
//     setClientSearch("");
//     setShowInvoiceDropdown(false);
//     setShowClientDropdown(false);
//   };

//   if (!isOpen) return null;

//   // Count how many date types are selected
//   const selectedDateCount = Object.values(dateTypes).filter(
//     (type) => type.selected
//   ).length;

//   const filteredInvoices = invoiceNumbers.filter((no) =>
//     no.toLowerCase().includes(invoiceSearch.toLowerCase())
//   );

//   const filteredClients = clientNames.filter((name) =>
//     name.toLowerCase().includes(clientSearch.toLowerCase())
//   );

//   return (
//     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-gray-200 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
//         {/* Header */}
//         <div className="border-b border-gray-200 px-6 py-4">
//           <div className="flex justify-between items-center">
//             <div>
//               <h2 className="text-lg font-bold text-gray-900">
//                 Advanced Search
//               </h2>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 Filter invoices by multiple criteria
//               </p>
//             </div>
//             <button
//               onClick={onClose}
//               className="hover:bg-gray-100 p-2 rounded-full transition-colors"
//               aria-label="Close"
//             >
//               <X size={20} className="text-gray-500" />
//             </button>
//           </div>
//         </div>

//         {/* Body */}
//         <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
//           <div className="space-y-6">
//             {/* Basic Filters */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* Invoice No */}
//               <div className="space-y-1.5 relative">
//                 <label className="block text-xs font-medium text-gray-700">
//                   Invoice Number
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Search invoice..."
//                   value={invoiceSearch}
//                   onFocus={() => setShowInvoiceDropdown(true)}
//                   onChange={(e) => {
//                     setInvoiceSearch(e.target.value);
//                     setShowInvoiceDropdown(true);
//                   }}
//                   className="w-full border rounded-lg px-3 py-2 text-sm"
//                 />

//                 {showInvoiceDropdown && (
//                   <div className="absolute z-10 w-full shadow-lg border rounded-lg mt-1 max-h-32 overflow-y-auto bg-gray-200">
//                     {filteredInvoices.map((no) => (
//                       <div
//                         key={no}
//                         className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
//                         onClick={() => {
//                           setFilters({ ...filters, invoiceNo: no });
//                           setInvoiceSearch(no);
//                           setShowInvoiceDropdown(false);
//                         }}
//                       >
//                         {no}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Client Name */}
//               <div className="space-y-1.5 relative">
//                 <label className="block text-xs font-medium text-gray-700">
//                   Client Name
//                 </label>

//                 <input
//                   type="text"
//                   placeholder="Search client..."
//                   value={clientSearch}
//                   onFocus={() => setShowClientDropdown(true)}
//                   onChange={(e) => {
//                     setClientSearch(e.target.value);
//                     setShowClientDropdown(true);
//                   }}
//                   className="w-full border rounded-lg px-3 py-2 text-sm"
//                 />

//                 {showClientDropdown && (
//                   <div className="absolute z-10 w-full shadow-lg border rounded-lg mt-1 max-h-32 overflow-y-auto bg-gray-200">
//                     {filteredClients.map((name) => (
//                       <div
//                         key={name}
//                         className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
//                         onClick={() => {
//                           setFilters({ ...filters, clientName: name });
//                           setClientSearch(name);
//                           setShowClientDropdown(false);
//                         }}
//                       >
//                         {name}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Status */}
//               <div className="space-y-1.5">
//                 <label className="block text-xs font-medium text-gray-700">
//                   Payment Status
//                 </label>
//                 <select
//                   name="paymentStatus"
//                   value={filters.paymentStatus}
//                   onChange={handleChange}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                 >
//                   <option value="">All Statuses</option>
//                   <option value="fully_paid">Fully_Paid</option>
//                   <option value="partially_paid">Partially_Paid</option>
//                   <option value="unpaid">Unpaid</option>
//                 </select>
//               </div>
//               {/* Journal Posted */}
// <div className="space-y-1.5">
//   <label className="block text-xs font-medium text-gray-700">
//     Journal Posted
//   </label>
//   <select
//     name="journalPosted"
//     value={filters.journalPosted}
//     onChange={handleChange}
//     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
//   >
//     <option value="">All</option>
//     <option value="yes">Yes</option>
//     <option value="no">No</option>
//   </select>
// </div>

//             </div>

//             {/* Date Type Selection - Compact Radio Style */}
//             <div className="pt-4 border-t border-gray-200">
//               <label className="block text-xs font-medium text-gray-700 mb-3">
//                 Select Date Type(s)
//               </label>
//               <div className="flex items-center gap-6">
//                 {/* Invoice Date */}
//                 <label className="flex items-center gap-2 cursor-pointer group">
//                   <div className="relative">
//                     <input
//                       type="checkbox"
//                       checked={dateTypes.invoiceDate.selected}
//                       onChange={() => handleDateTypeToggle("invoiceDate")}
//                       className="sr-only"
//                     />
//                     <div
//                       className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
//                         dateTypes.invoiceDate.selected
//                           ? "border-blue-500 bg-blue-500"
//                           : "border-gray-300 group-hover:border-gray-400"
//                       }`}
//                     >
//                       {dateTypes.invoiceDate.selected && (
//                         <div className="w-2 h-2 rounded-full bg-white"></div>
//                       )}
//                     </div>
//                   </div>
//                   <span
//                     className={`text-sm font-medium ${
//                       dateTypes.invoiceDate.selected
//                         ? "text-blue-600"
//                         : "text-gray-600 group-hover:text-gray-900"
//                     }`}
//                   >
//                     Invoice Date
//                   </span>
//                 </label>

//                 {/* Created Date */}
//                 <label className="flex items-center gap-2 cursor-pointer group">
//                   <div className="relative">
//                     <input
//                       type="checkbox"
//                       checked={dateTypes.createdAt.selected}
//                       onChange={() => handleDateTypeToggle("createdAt")}
//                       className="sr-only"
//                     />
//                     <div
//                       className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
//                         dateTypes.createdAt.selected
//                           ? "border-blue-500 bg-blue-500"
//                           : "border-gray-300 group-hover:border-gray-400"
//                       }`}
//                     >
//                       {dateTypes.createdAt.selected && (
//                         <div className="w-2 h-2 rounded-full bg-white"></div>
//                       )}
//                     </div>
//                   </div>
//                   <span
//                     className={`text-sm font-medium ${
//                       dateTypes.createdAt.selected
//                         ? "text-blue-600"
//                         : "text-gray-600 group-hover:text-gray-900"
//                     }`}
//                   >
//                     Created Date
//                   </span>
//                 </label>

//                 {/* Posted Date */}
//                 <label className="flex items-center gap-2 cursor-pointer group">
//                   <div className="relative">
//                     <input
//                       type="checkbox"
//                       checked={dateTypes.salesJournalPostedAt.selected}
//                       onChange={() =>
//                         handleDateTypeToggle("salesJournalPostedAt")
//                       }
//                       className="sr-only"
//                     />
//                     <div
//                       className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
//                         dateTypes.salesJournalPostedAt.selected
//                           ? "border-blue-500 bg-blue-500"
//                           : "border-gray-300 group-hover:border-gray-400"
//                       }`}
//                     >
//                       {dateTypes.salesJournalPostedAt.selected && (
//                         <div className="w-2 h-2 rounded-full bg-white"></div>
//                       )}
//                     </div>
//                   </div>
//                   <span
//                     className={`text-sm font-medium ${
//                       dateTypes.salesJournalPostedAt.selected
//                         ? "text-blue-600"
//                         : "text-gray-600 group-hover:text-gray-900"
//                     }`}
//                   >
//                     Posted Date
//                   </span>
//                 </label>
//               </div>
//             </div>

//             {/* Dynamic Date Range Inputs */}
//             {selectedDateCount > 0 && (
//               <div className="pt-4 border-t border-gray-200">
//                 <div className="space-y-4">
//                   {/* Invoice Date Range */}
//                   {dateTypes.invoiceDate.selected && (
//                     <div className="space-y-2">
//                       <label className="block text-xs font-medium text-gray-700">
//                         Invoice Date Range
//                       </label>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div className="space-y-1.5">
//                           <label className="block text-xs text-gray-500">
//                             From
//                           </label>
//                           <input
//                             type="date"
//                             value={dateTypes.invoiceDate.from}
//                             onChange={(e) =>
//                               handleDateChange(
//                                 "invoiceDate",
//                                 "from",
//                                 e.target.value
//                               )
//                             }
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="block text-xs text-gray-500">
//                             To
//                           </label>
//                           <input
//                             type="date"
//                             value={dateTypes.invoiceDate.to}
//                             onChange={(e) =>
//                               handleDateChange(
//                                 "invoiceDate",
//                                 "to",
//                                 e.target.value
//                               )
//                             }
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   {/* Created Date Range */}
//                   {dateTypes.createdAt.selected && (
//                     <div className="space-y-2">
//                       <label className="block text-xs font-medium text-gray-700">
//                         Created Date Range
//                       </label>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div className="space-y-1.5">
//                           <label className="block text-xs text-gray-500">
//                             From
//                           </label>
//                           <input
//                             type="date"
//                             value={dateTypes.createdAt.from}
//                             onChange={(e) =>
//                               handleDateChange(
//                                 "createdAt",
//                                 "from",
//                                 e.target.value
//                               )
//                             }
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="block text-xs text-gray-500">
//                             To
//                           </label>
//                           <input
//                             type="date"
//                             value={dateTypes.createdAt.to}
//                             onChange={(e) =>
//                               handleDateChange(
//                                 "createdAt",
//                                 "to",
//                                 e.target.value
//                               )
//                             }
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   {/* Posted Date Range */}
//                   {dateTypes.salesJournalPostedAt.selected && (
//                     <div className="space-y-2">
//                       <label className="block text-xs font-medium text-gray-700">
//                         Posted Date Range
//                       </label>
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div className="space-y-1.5">
//                           <label className="block text-xs text-gray-500">
//                             From
//                           </label>
//                           <input
//                             type="date"
//                             value={dateTypes.salesJournalPostedAt.from}
//                             onChange={(e) =>
//                               handleDateChange(
//                                 "salesJournalPostedAt",
//                                 "from",
//                                 e.target.value
//                               )
//                             }
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                           />
//                         </div>
//                         <div className="space-y-1.5">
//                           <label className="block text-xs text-gray-500">
//                             To
//                           </label>
//                           <input
//                             type="date"
//                             value={dateTypes.salesJournalPostedAt.to}
//                             onChange={(e) =>
//                               handleDateChange(
//                                 "salesJournalPostedAt",
//                                 "to",
//                                 e.target.value
//                               )
//                             }
//                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="border-t border-gray-200 px-6 py-4 bg-gray-150 rounded-b-2xl">
//           <div className="flex justify-between items-center">
//             <button
//               onClick={handleClear}
//               className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
//             >
//               Clear All Filters
//             </button>
//             <div className="flex gap-3">
//               <button
//                 onClick={onClose}
//                 className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleSearch}
//                 className="px-5 py-2 text-sm font-medium bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 shadow-sm hover:shadow transition-all"
//               >
//                 Apply Filters
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdvancedInvoiceSearch;












import React, { useState, useEffect } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { getUsersApi } from "../apis/userApi";

const AdvancedInvoiceSearch = ({
  isOpen,
  onClose,
  onSearch,
  invoiceNumbers = [],
  clientNames = [],
  createdByUsers = [], // NEW PROP
}) => {
  const [filters, setFilters] = useState({
    invoiceNo: "",
    clientName: "",
    paymentStatus: "",
    journalPosted: "",
    createdBy: "", // NEW FILTER
  });

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [createdBySearch, setCreatedBySearch] = useState(""); // NEW SEARCH
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCreatedByDropdown, setShowCreatedByDropdown] = useState(false); // NEW DROPDOWN

  const [dateTypes, setDateTypes] = useState({
    invoiceDate: { selected: false, from: "", to: "" },
    createdAt: { selected: false, from: "", to: "" },
    salesJournalPostedAt: { selected: false, from: "", to: "" },
  });

  // Refs for dropdown click outside handling
  const invoiceRef = React.useRef(null);
  const clientRef = React.useRef(null);
  const createdByRef = React.useRef(null);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilters({
        invoiceNo: "",
        clientName: "",
        paymentStatus: "",
        journalPosted: "",
        createdBy: "", // RESET
      });
      setInvoiceSearch("");
      setClientSearch("");
      setCreatedBySearch(""); // RESET
      setDateTypes({
        invoiceDate: { selected: false, from: "", to: "" },
        createdAt: { selected: false, from: "", to: "" },
        salesJournalPostedAt: { selected: false, from: "", to: "" },
      });
    }
  }, [isOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (invoiceRef.current && !invoiceRef.current.contains(event.target)) {
        setShowInvoiceDropdown(false);
      }
      if (clientRef.current && !clientRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
      if (createdByRef.current && !createdByRef.current.contains(event.target)) {
        setShowCreatedByDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleDateTypeToggle = (dateType) => {
    setDateTypes({
      ...dateTypes,
      [dateType]: {
        ...dateTypes[dateType],
        selected: !dateTypes[dateType].selected,
      },
    });
  };

  const handleDateChange = (dateType, field, value) => {
    setDateTypes({
      ...dateTypes,
      [dateType]: {
        ...dateTypes[dateType],
        [field]: value,
      },
    });
  };

  const handleSearch = () => {
    // Prepare date filters for selected date types
    const dateFilters = {};

    // Handle invoiceDate range - only add if selected AND has values
    if (dateTypes.invoiceDate.selected) {
      if (
        dateTypes.invoiceDate.from &&
        dateTypes.invoiceDate.from.trim() !== ""
      ) {
        dateFilters.invoiceDateFrom = dateTypes.invoiceDate.from;
      }
      if (dateTypes.invoiceDate.to && dateTypes.invoiceDate.to.trim() !== "") {
        dateFilters.invoiceDateTo = dateTypes.invoiceDate.to;
      }
    }

    // Handle createdAt range - only add if selected AND has values
    if (dateTypes.createdAt.selected) {
      if (dateTypes.createdAt.from && dateTypes.createdAt.from.trim() !== "") {
        dateFilters.createdAtFrom = dateTypes.createdAt.from;
      }
      if (dateTypes.createdAt.to && dateTypes.createdAt.to.trim() !== "") {
        dateFilters.createdAtTo = dateTypes.createdAt.to;
      }
    }

    // Handle salesJournalPostedAt range - only add if selected AND has values
    if (dateTypes.salesJournalPostedAt.selected) {
      if (
        dateTypes.salesJournalPostedAt.from &&
        dateTypes.salesJournalPostedAt.from.trim() !== ""
      ) {
        dateFilters.salesJournalPostedAtFrom =
          dateTypes.salesJournalPostedAt.from;
      }
      if (
        dateTypes.salesJournalPostedAt.to &&
        dateTypes.salesJournalPostedAt.to.trim() !== ""
      ) {
        dateFilters.salesJournalPostedAtTo = dateTypes.salesJournalPostedAt.to;
      }
    }

    // Filter out empty values from filters
    const activeFilters = Object.entries(filters).reduce(
      (acc, [key, value]) => {
        if (value && value.trim() !== "") {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    // Combine all filters
    const finalFilters = { ...activeFilters, ...dateFilters };

    console.log("Advanced Search Filters:", finalFilters); // For debugging
    console.log("Date Types State:", dateTypes); // For debugging

    onSearch(finalFilters);
  };

  const handleClear = () => {
    setFilters({
      invoiceNo: "",
      clientName: "",
      paymentStatus: "",
      journalPosted: "",
      createdBy: "", // CLEAR
    });
    setDateTypes({
      invoiceDate: { selected: false, from: "", to: "" },
      createdAt: { selected: false, from: "", to: "" },
      salesJournalPostedAt: { selected: false, from: "", to: "" },
    });
    setInvoiceSearch("");
    setClientSearch("");
    setCreatedBySearch(""); // CLEAR
    setShowInvoiceDropdown(false);
    setShowClientDropdown(false);
    setShowCreatedByDropdown(false); // CLEAR
  };

  if (!isOpen) return null;

  // Count how many date types are selected
  const selectedDateCount = Object.values(dateTypes).filter(
    (type) => type.selected
  ).length;

  const filteredInvoices = invoiceNumbers.filter((no) =>
    no.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  const filteredClients = clientNames.filter((name) =>
    name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // NEW: Filter created by users
  const filteredCreatedBy = createdByUsers.filter((user) =>
    user.name.toLowerCase().includes(createdBySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-200 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Advanced Search
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Filter invoices by multiple criteria
              </p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-gray-100 p-2 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice No */}
              <div className="space-y-1.5 relative" ref={invoiceRef}>
                <label className="block text-xs font-medium text-gray-700">
                  Invoice Number
                </label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                >
                  <input
                    type="text"
                    placeholder="Select or search invoice..."
                    value={filters.invoiceNo || invoiceSearch}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-pointer pr-8 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-transparent"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {showInvoiceDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-gray-100 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={invoiceSearch}
                          onChange={(e) => {
                            setInvoiceSearch(e.target.value);
                            setShowInvoiceDropdown(true);
                          }}
                          placeholder="Search invoices..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((no) => (
                          <div
                            key={no}
                            className="px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-gray-50 last:border-0 text-xs"
                            onClick={() => {
                              setFilters({ ...filters, invoiceNo: no });
                              setInvoiceSearch(no);
                              setShowInvoiceDropdown(false);
                            }}
                          >
                            {no}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-gray-500 text-xs">
                          No invoices found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Client Name */}
              <div className="space-y-1.5 relative" ref={clientRef}>
                <label className="block text-xs font-medium text-gray-700">
                  Client Name
                </label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                >
                  <input
                    type="text"
                    placeholder="Select or search client..."
                    value={filters.clientName || clientSearch}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-pointer pr-8 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-transparent"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {showClientDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-gray-100 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setShowClientDropdown(true);
                          }}
                          placeholder="Search clients..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((name) => (
                          <div
                            key={name}
                            className="px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-gray-50 last:border-0 text-xs"
                            onClick={() => {
                              setFilters({ ...filters, clientName: name });
                              setClientSearch(name);
                              setShowClientDropdown(false);
                            }}
                          >
                            {name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-gray-500 text-xs">
                          No clients found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  value={filters.paymentStatus}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all bg-gray-100"
                >
                  <option value="">All Statuses</option>
                  <option value="fully_paid">Fully_Paid</option>
                  <option value="partially_paid">Partially_Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {/* Journal Posted */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  Journal Posted
                </label>
                <select
                  name="journalPosted"
                  value={filters.journalPosted}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100"
                >
                  <option value="">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Created By */}
              <div className="space-y-1.5 relative md:col-span-1" ref={createdByRef}>
                <label className="block text-xs font-medium text-gray-700">
                  Created By
                </label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => setShowCreatedByDropdown(!showCreatedByDropdown)}
                >
                  <input
                    type="text"
                    placeholder="Select or search user..."
                    value={filters.createdBy ? createdByUsers.find(u => u._id === filters.createdBy)?.name || createdBySearch : createdBySearch}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-pointer pr-8 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-transparent"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {showCreatedByDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-gray-100 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={createdBySearch}
                          onChange={(e) => {
                            setCreatedBySearch(e.target.value);
                            setShowCreatedByDropdown(true);
                          }}
                          placeholder="Search users..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCreatedBy.length > 0 ? (
                        filteredCreatedBy.map((user) => (
                          <div
                            key={user._id}
                            className="px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-gray-50 last:border-0 text-xs"
                            onClick={() => {
                              setFilters({ ...filters, createdBy: user._id });
                              setCreatedBySearch(user.name);
                              setShowCreatedByDropdown(false);
                            }}
                          >
                            {user.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-gray-500 text-xs">
                          No users found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date Type Selection - Compact Radio Style */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-700 mb-3">
                Select Date Type(s)
              </label>
              <div className="flex items-center gap-6">
                {/* Invoice Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.invoiceDate.selected}
                      onChange={() => handleDateTypeToggle("invoiceDate")}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.invoiceDate.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.invoiceDate.selected && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.invoiceDate.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    Invoice Date
                  </span>
                </label>

                {/* Created Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.createdAt.selected}
                      onChange={() => handleDateTypeToggle("createdAt")}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.createdAt.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.createdAt.selected && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.createdAt.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    Created Date
                  </span>
                </label>

                {/* Posted Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.salesJournalPostedAt.selected}
                      onChange={() =>
                        handleDateTypeToggle("salesJournalPostedAt")
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.salesJournalPostedAt.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.salesJournalPostedAt.selected && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.salesJournalPostedAt.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    Posted Date
                  </span>
                </label>
              </div>
            </div>

            {/* Dynamic Date Range Inputs */}
            {selectedDateCount > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  {/* Invoice Date Range */}
                  {dateTypes.invoiceDate.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Invoice Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.invoiceDate.from}
                            onChange={(e) =>
                              handleDateChange(
                                "invoiceDate",
                                "from",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.invoiceDate.to}
                            onChange={(e) =>
                              handleDateChange(
                                "invoiceDate",
                                "to",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Created Date Range */}
                  {dateTypes.createdAt.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Created Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.createdAt.from}
                            onChange={(e) =>
                              handleDateChange(
                                "createdAt",
                                "from",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.createdAt.to}
                            onChange={(e) =>
                              handleDateChange(
                                "createdAt",
                                "to",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Posted Date Range */}
                  {dateTypes.salesJournalPostedAt.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Posted Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.salesJournalPostedAt.from}
                            onChange={(e) =>
                              handleDateChange(
                                "salesJournalPostedAt",
                                "from",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.salesJournalPostedAt.to}
                            onChange={(e) =>
                              handleDateChange(
                                "salesJournalPostedAt",
                                "to",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-100 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                className="px-5 py-2 text-sm font-medium bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 shadow-sm hover:shadow transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedInvoiceSearch;