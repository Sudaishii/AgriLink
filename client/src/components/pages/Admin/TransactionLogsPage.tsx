import React, { useState, useEffect } from 'react';
import { API_BASE_URL, getStoredAuthToken } from '../../../api/apiConfig';
import {
  Search,
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Calendar,
  Activity,
} from 'lucide-react';
import DashboardCard from '../../ui/DashboardCard';

type TransactionType = 'Sale' | 'Refund';

interface TransactionEntry {
  id: string;
  type: TransactionType;
  actor: string;
  detail: string;
  price: number;
  status: 'Completed' | 'Pending' | 'Failed' | 'Cancelled' | 'Confirmed';
  time: string;
  date: string;
}

const TransactionLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<TransactionType | 'All'>('All');
  const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = getStoredAuthToken();
        const response = await fetch(`${API_BASE_URL}/purchases/transactions/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        const txData = data.transactions || [];
        const mappedTx = txData.map((tx: any) => {
          const rawStatus = tx.req_status || 'Pending';
          let parsedStatus: TransactionEntry['status'];

          if (rawStatus === 'Confirmed' || rawStatus === 'Processing') parsedStatus = 'Confirmed';
          else if (rawStatus === 'Cancelled') parsedStatus = 'Cancelled';
          else if (rawStatus === 'Completed' || rawStatus === 'Delivered') parsedStatus = 'Completed';
          else parsedStatus = 'Pending';

          const qty = Number(tx.quantity || 0);
          const unitPrice = Number(tx.p_price || 0);
          const totalPrice = qty * unitPrice;

          return {
            id: tx.invoice_number || `ORD-${tx.req_id}`,
            type: parsedStatus === 'Cancelled' ? 'Refund' : 'Sale',
            actor: `${tx.buyer_first || ''} ${tx.buyer_last || ''}`.trim() || 'Market User',
            detail: `Direct peer-to-peer transaction for ${tx.p_name || 'an item'} with Farmer ${tx.farmer_first} ${tx.farmer_last}`,
            price: totalPrice,
            status: parsedStatus,
            date: new Date(tx.req_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            time: new Date(tx.req_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          } as TransactionEntry;
        });

        setTransactions(mappedTx);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const totalProcessed = transactions.filter((t) => t.status === 'Completed').length;
  const activePending = transactions.filter((t) => t.status === 'Pending').length;
  const totalCancelled = transactions.filter((t) => t.status === 'Cancelled').length;

  const filtered = transactions.filter((trx) => {
    const matchSearch =
      trx.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = activeType === 'All' || trx.type === activeType;
    return matchSearch && matchType;
  });

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const csvEscape = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const handleExportCsv = () => {
    if (filtered.length === 0) return;

    const headers = ['Type', 'User', 'Receipt ID', 'Transaction Detail', 'Price', 'Status', 'Date', 'Time'];
    const rows = filtered.map((trx) => [
      trx.type,
      trx.actor,
      trx.id,
      trx.detail,
      trx.price.toFixed(2),
      trx.status,
      trx.date,
      trx.time,
    ]);

    const csv = [headers, ...rows].map((line) => line.map((col) => csvEscape(col)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `transaction-logs-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      <div className="bg-white border-b border-gray-100 py-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#5ba409] uppercase tracking-widest">Transaction Audit Trail</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Transaction History</h1>
            <p className="text-sm text-gray-500 max-w-xl">
              A secure audit log of all systematic transactions, orders, and settlements.
              Designed for traceability and dispute resolution without exposing sensitive financial balances.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5ba409] transition-colors" />
              <input
                type="text"
                placeholder="Search by ID, user, or detail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:border-[#5ba409]/50 focus:ring-2 focus:ring-[#5ba409]/10 transition-all outline-none placeholder:text-gray-300 shadow-sm"
              />
            </div>
            <button
              onClick={handleExportCsv}
              disabled={loading || filtered.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 sm:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <DashboardCard
            icon={Activity}
            title="Total Processed"
            value={totalProcessed.toString()}
            subtitle="Completed Orders"
            color="#5ba409"
          />
          <DashboardCard
            icon={Calendar}
            title="Pending Activity"
            value={activePending.toString()}
            subtitle="Orders in Progress"
            color="#2196F3"
          />
          <DashboardCard
            icon={ShieldCheck}
            title="Cancelled Traces"
            value={totalCancelled.toString()}
            subtitle="Reversed Orders"
            color="#FF9800"
          />
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audit Ledger</h2>
            </div>

            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              {['All', 'Sale', 'Refund'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type as TransactionType | 'All')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all tracking-wide ${
                    activeType === type
                      ? 'bg-white shadow-sm text-gray-900 border border-gray-200'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Clock className="animate-spin text-[#5ba409] mb-3" size={32} />
                <p className="text-gray-400 font-medium">Synchronizing Secure Ledger...</p>
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-4 px-8 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Type</th>
                    <th className="py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">User</th>
                    <th className="py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 text-center">Receipt ID</th>
                    <th className="py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Transaction Detail</th>
                    <th className="py-4 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 text-right">Price</th>
                    <th className="py-4 px-8 text-xs font-bold uppercase tracking-wider text-gray-400 text-right border-b border-gray-100">Date Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((trx, idx) => (
                    <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-8">
                        <div
                          className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
                            trx.type === 'Sale' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {trx.type === 'Refund' ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                          {trx.type}
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-extrabold text-sm text-gray-500">
                            {trx.actor.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-gray-900 leading-none">{trx.actor}</p>
                            <p className="text-xs font-medium text-gray-400 mt-1">Platform User</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 text-center">
                        <span className="font-mono text-xs font-bold text-gray-400">{trx.id}</span>
                      </td>
                      <td className="py-5">
                        <p className="text-sm font-semibold text-gray-900">{trx.detail}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${trx.status === 'Completed' ? 'bg-[#5ba409]' : 'bg-amber-400'}`} />
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${
                              trx.status === 'Completed' ? 'text-[#5ba409]' : 'text-amber-500'
                            }`}
                          >
                            {trx.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 text-right">
                        <span className="text-sm font-bold text-gray-900">{formatPrice(trx.price)}</span>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex flex-col items-end justify-center">
                          <span className="text-sm font-bold text-gray-900">{trx.date}</span>
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-400 mt-0.5">
                            <Clock size={11} /> {trx.time}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-20 text-center text-gray-400 font-medium">No transactions found matching your criteria.</div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-blue-900">Audit Compliance Guarantee</p>
              <p className="text-sm font-medium text-blue-700/80 mt-1 max-w-2xl">
                Transaction logic is secured and historically immutable. Detailed financial balances are strictly hidden from this view to ensure privacy compliance while retaining tracking capability.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TransactionLogsPage;
