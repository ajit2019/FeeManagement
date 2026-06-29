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
            <div ref={printRef} className="printable-receipt p-6 text-black bg-white rounded-xl" style={{ maxWidth: '148mm', margin: '0 auto' }}>
              <style>{`
                @media print {
                  @page {
                    size: A5 landscape;
                    margin: 5mm;
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
                    width: 100% !important;
                    max-width: 148mm !important;
                    height: auto !important;
                    padding: 10px !important;
                    box-sizing: border-box !important;
                    font-family: ui-sans-serif, system-ui, sans-serif !important;
                    font-size: 11px !important;
                    line-height: 1.3 !important;
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
                <h1 className="text-lg font-extrabold tracking-wide uppercase">SIC Mahuli-Duddhi</h1>
                <h2 className="text-xs font-bold text-gray-700">FEE RECEIPT</h2>
                <p className="text-[10px] text-gray-500">Official Invoice Slip</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 text-xs">
                <p><strong>Slip No:</strong> {selectedTx.SlipNo}</p>
                <p><strong>Payment Date:</strong> {selectedTx.DatePaid}</p>
                <p><strong>StudentID:</strong> {selectedTx.StudentID}</p>
                <p><strong>Name:</strong> {selectedTx.StudentName}</p>
                <p><strong>Fee Description:</strong> {selectedTx.FeeHead}</p>
                <p><strong>Fee Month:</strong> {selectedTx.MonthPaid}</p>
                <p className="col-span-2"><strong>Collected By:</strong> {selectedTx.CollectedBy}</p>
              </div>
              <hr />
              <div className="flex font-bold text-sm justify-between mt-2">
                <span>Amount Paid:</span>
                <span className="text-green-700">₹{parseFloat(selectedTx.AmountReceived).toFixed(2)}</span>
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
