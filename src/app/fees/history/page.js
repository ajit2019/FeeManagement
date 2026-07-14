'use client';

import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export default function FeeHistory() {
  const [history, setHistory] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/fees/history');
      const result = await res.json();
      if (result.success) {
        setHistory(result.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipt-${selectedTx?.SlipNo || 'Print'}`,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Receipt & Transaction History</h1>
        <p className="text-gray-500 mt-2">Historical log of all fee payments and slip generation.</p>

        {/* Transactions list */}
        <div className="mt-8">
          {isLoading ? (
            <p className="text-gray-500">Loading payment ledger...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-400 italic text-center py-8">No payments logged yet.</p>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-xl shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slip No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Head</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{tx.SlipNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.StudentID}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{tx.StudentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.FeeHead}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.MonthPaid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">₹{parseFloat(tx.AmountReceived).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.DatePaid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Formal Invoice Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <div ref={printRef} className="printable-receipt p-6 text-black bg-white rounded-xl" style={{ width: '21cm', height: '15cm', margin: '0 auto' }}>
              <style>{`
                @media print {
                  @page {
                    margin: 0;
                  }
                  html, body {
                    display: block !important;
                    height: auto !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .printable-receipt, .printable-receipt * {
                    visibility: visible;
                  }
                  .printable-receipt {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 21cm !important;
                    height: 15cm !important;
                    padding: 12mm !important;
                    box-sizing: border-box !important;
                    font-family: ui-sans-serif, system-ui, sans-serif !important;
                    font-size: 12px !important;
                    line-height: 1.4 !important;
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                  }
                  .printable-receipt h1 {
                    font-size: 16px !important;
                    font-weight: 800 !important;
                    margin-bottom: 2px !important;
                  }
                  .printable-receipt h2 {
                    font-size: 12px !important;
                    font-weight: bold !important;
                    margin-bottom: 4px !important;
                  }
                  .printable-receipt hr {
                    border-top: 1px dashed #000 !important;
                    margin: 4px 0 !important;
                  }
                  .printable-receipt .grid {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 2px 8px !important;
                  }
                  .printable-receipt .flex {
                    display: flex !important;
                    justify-content: space-between !important;
                  }
                }
              `}</style>
              
              <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                <h1 className="text-lg font-extrabold tracking-wide uppercase">SIC-Mahuli Dudhhi</h1>
                <h2 className="text-xs font-bold text-gray-700">FEE RECEIPT</h2>
                <p className="text-[10px] text-gray-500">Official Invoice Slip</p>
              </div>

              {/* Student & Slip Info */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-b pb-3 mb-3">
                <div><strong>Slip No:</strong> {selectedTx.SlipNo}</div>
                <div className="text-right"><strong>Date:</strong> {selectedTx.DatePaid}</div>
                <div><strong>Student ID:</strong> {selectedTx.StudentID}</div>
                <div className="text-right"><strong>Collected By:</strong> {selectedTx.CollectedBy}</div>
                <div className="col-span-2"><strong>Student Name:</strong> {selectedTx.StudentName}</div>
              </div>

              {/* Fee Description Table/Row */}
              <div className="flex-grow">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1">Fee Description</th>
                      <th className="py-1">Month</th>
                      <th className="py-1 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">{selectedTx.FeeHead}</td>
                      <td className="py-2">{selectedTx.MonthPaid || 'N/A'}</td>
                      <td className="py-2 text-right font-bold text-green-700 print:text-black">₹{parseFloat(selectedTx.AmountReceived || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="border-t border-black pt-3 flex justify-end">
                <div className="text-center w-36 border-t border-black mt-6 pt-1">
                  <span className="text-[10px] font-bold block text-gray-500 print:text-black">Authorized Signatory</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-bold text-gray-700"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
