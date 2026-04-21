import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, getStoredAuthToken } from '../../api/apiConfig';
import {
  FileText, Search, Download, Clock, Shield, Settings,
  AlertTriangle, CheckCircle, XCircle, Info, Activity,
  ShieldCheck, Calendar, RefreshCw, Filter, Globe,
  Zap, AlertOctagon, User, Tag, Cpu,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Severity = 'info' | 'success' | 'warning' | 'error' | 'critical';
type Category = 'All' | 'User' | 'Security' | 'System' | 'Order' | 'Messaging';

interface LogEntry {
  log_id:         number;
  correlation_id: string | null;
  user_id:        number | null;
  user_name:      string;
  user_role:      string;
  action:         string;
  event_type:     string | null;
  module:         string | null;
  description:    string | null;
  category:       string;
  severity:       Severity;
  method:         string | null;
  endpoint:       string | null;
  http_status:    number | null;
  error_code:     string | null;
  error_message:  string | null;
  ip_address:     string | null;
  user_agent:     string | null;
  duration_ms:    number | null;
  before_data:    string | null;
  after_data:     string | null;
  created_at:     string;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const SEV_CONFIG: Record<Severity, { icon: React.ElementType; label: string; color: string; bg: string; badge: string }> = {
  info:     { icon: Info,          label: 'Info',     color: 'text-blue-600',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700' },
  success:  { icon: CheckCircle,   label: 'Success',  color: 'text-green-600',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700' },
  warning:  { icon: AlertTriangle, label: 'Warning',  color: 'text-amber-600',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700' },
  error:    { icon: XCircle,       label: 'Error',    color: 'text-red-600',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700' },
  critical: { icon: AlertOctagon,  label: 'Critical', color: 'text-rose-700',   bg: 'bg-rose-50',   badge: 'bg-rose-100 text-rose-800' },
};

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-sky-50 text-sky-700',
  POST:   'bg-green-50 text-green-700',
  PUT:    'bg-amber-50 text-amber-700',
  PATCH:  'bg-orange-50 text-orange-700',
  DELETE: 'bg-red-50 text-red-700',
};

const STATUS_COLOR = (code: number | null) => {
  if (!code) return 'text-gray-400';
  if (code >= 500) return 'text-rose-600 font-bold';
  if (code >= 400) return 'text-amber-600 font-bold';
  if (code >= 200) return 'text-green-600 font-semibold';
  return 'text-gray-500';
};

const getActionColor = (action: string) => {
  const act = action.toLowerCase();
  if (act.includes('delete') || act.includes('cancel') || act.includes('logout') || act.includes('suspend') || act.includes('fail') || act.includes('revoke') || act.includes('archived')) {
    return 'bg-rose-50 text-rose-700 border-rose-100';
  }
  if (act.includes('create') || act.includes('login') || act.includes('success') || act.includes('active') || act.includes('award') || act.includes('confirm')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (act.includes('update') || act.includes('edit') || act.includes('change')) {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }
  if (act.includes('invite') || act.includes('magic') || act.includes('info')) {
    return 'bg-sky-50 text-sky-700 border-sky-100';
  }
  return 'bg-gray-50 text-gray-700 border-gray-100';
};

const CATEGORIES: Category[] = ['All', 'Security', 'User', 'System', 'Order', 'Messaging'];
const SEVERITIES = ['All', 'info', 'success', 'warning', 'error', 'critical'];

// ─── Component ───────────────────────────────────────────────────────────────

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  // Filters (client-side quick filter + server-side fetch filters)
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState<Category>('All');
  const [severity, setSeverity]     = useState('All');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredAuthToken();
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (severity !== 'All') params.set('severity', severity);
      if (search.trim())      params.set('search', search.trim());
      if (dateFrom)           params.set('from', dateFrom);
      if (dateTo)             params.set('to', dateTo + 'T23:59:59');
      params.set('limit', '500');

      const res = await fetch(`${API_BASE_URL}/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[SystemLogs] API Response:', data); // Diagnostic
      const raw: LogEntry[] = Array.isArray(data.logs) ? data.logs : [];
      setLogs(raw);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('[SystemLogs] Fetch Error:', e); // Diagnostic
    } finally {
      setLoading(false);
    }
  }, [category, severity, search, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ─── Metrics ──────────────────────────────────────────────────────────────

  const metrics = {
    total:    logs.length,
    critical: logs.filter(l => l.severity === 'critical' || l.severity === 'error').length,
    warnings: logs.filter(l => l.severity === 'warning').length,
    security: logs.filter(l => l.category === 'Security').length,
    success:  logs.filter(l => l.severity === 'success').length,
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['Log ID','Timestamp','Severity','Category','User','Role','Action','Module','Endpoint','Status','Duration(ms)','IP','Detail'];
    const rows = logs.map(l => [
      l.log_id,
      l.created_at,
      l.severity,
      l.category,
      l.user_name,
      l.user_role,
      l.action,
      l.module || '',
      l.endpoint || '',
      l.http_status || '',
      l.duration_ms || '',
      l.ip_address || '',
      (l.description || '').replace(/,/g, ';'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrilink-system-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F6F8FA]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-500">Audit Logs</span>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">System Audit</h1>
            <p className="text-sm text-gray-500 max-w-2xl">
              Immutable audit trail of all system events — authentication, user management, orders, messaging, and security incidents.
              Logs are auto-captured with full request context, masked for privacy compliance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative group flex-1 sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5ba409] transition-colors" />
              <input
                type="text"
                placeholder="Search by user, action, endpoint…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#5ba409]/50 focus:ring-2 focus:ring-[#5ba409]/10 outline-none transition-all placeholder:text-gray-300 shadow-sm"
              />
            </div>

            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border shadow-sm transition-all ${showFilters ? 'bg-[#5ba409] text-white border-[#5ba409]' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
            >
              <Filter size={14} /> Filters
            </button>

            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:border-gray-300 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:border-gray-300 transition-all whitespace-nowrap"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Advanced Filters ── */}
        {showFilters && (
          <div className="max-w-[1600px] mx-auto px-6 sm:px-10 mt-5 flex flex-wrap gap-4 items-end">
            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Category</label>
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${category === cat ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Severity</label>
              <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                {SEVERITIES.map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${severity === sev ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#5ba409]/50" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#5ba409]/50" />
            </div>

            <button
              onClick={fetchLogs}
              className="px-5 py-2.5 bg-[#5ba409] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#4a8c07] transition-all"
            >
              Apply Filters
            </button>
            <button
              onClick={() => { setCategory('All'); setSeverity('All'); setDateFrom(''); setDateTo(''); setSearch(''); }}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <main className="max-w-[1600px] mx-auto px-6 sm:px-10 py-8">

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Logs',     val: metrics.total,    icon: FileText,    color: '#5ba409' },
            { label: 'Critical/Error', val: metrics.critical, icon: AlertOctagon, color: '#EF4444' },
            { label: 'Warnings',       val: metrics.warnings, icon: AlertTriangle, color: '#F59E0B' },
            { label: 'Security Events',val: metrics.security, icon: ShieldCheck,  color: '#7C3AED' },
            { label: 'Successes',      val: metrics.success,  icon: CheckCircle,  color: '#10B981' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 leading-none">{val}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Logs Table ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Audit Logs</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {logs.length} event{logs.length !== 1 ? 's' : ''} · Last refreshed {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              Live Monitoring
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Cpu className="animate-spin text-[#5ba409]" size={32} />
                <p className="text-gray-400 font-medium">Loading system events…</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-24 text-center">
                <FileText className="mx-auto text-gray-200 mb-3" size={40} />
                <p className="text-gray-400 font-medium">No log events found.</p>
                <p className="text-gray-300 text-sm mt-1">Try a different filter or wait for system activity.</p>
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-0 text-sm">
                <thead className="bg-gray-50/60">
                  <tr>
                    {['Severity','Actor','Action','Module','Status','Actioned At'].map(h => (
                      <th key={h} className="py-3.5 px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const sev = SEV_CONFIG[log.severity] || SEV_CONFIG['info'];
                    const SevIcon = sev.icon;
                    const ts = fmt(log.created_at);
                    const isExpanded = expandedLog === log.log_id;

                    return (
                      <React.Fragment key={log.log_id}>
                        <tr
                          className="group hover:bg-gray-50/60 transition-colors cursor-pointer"
                          onClick={() => setExpandedLog(isExpanded ? null : log.log_id)}
                        >
                          {/* Severity */}
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${sev.badge}`}>
                              <SevIcon size={11} />
                              {sev.label}
                            </span>
                          </td>


                          {/* Actor */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0">
                                {(log.user_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-gray-900 text-xs leading-none">{log.user_name || '—'}</p>
                                <p className="text-[10px] text-[#5ba409] font-bold mt-0.5 uppercase">{log.user_role}</p>
                                {log.user_id && <p className="text-[9px] text-gray-300 mt-0.5">ID:{log.user_id}</p>}
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-4 px-4 max-w-[220px]">
                            <div className={`inline-flex flex-col p-2 rounded-xl border ${getActionColor(log.action)}`}>
                              <p className="font-bold text-xs leading-none">{log.action}</p>
                              {log.event_type && (
                                <span className="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-wider">
                                  {log.event_type}
                                </span>
                              )}
                            </div>
                            {log.description && <p className="text-[10px] text-gray-400 mt-1.5 px-1 line-clamp-1 italic">{log.description}</p>}
                          </td>

                          {/* Module */}
                          <td className="py-4 px-4">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">
                              {log.module || '—'}
                            </span>
                          </td>


                          {/* HTTP Status */}
                          <td className="py-4 px-4">
                            <span className={`text-xs font-mono ${STATUS_COLOR(log.http_status)}`}>
                              {log.http_status || '—'}
                            </span>
                          </td>

                          {/* Actioned At (Timestamp) */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <p className="font-bold text-gray-900 text-[12px]">{ts.date}</p>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} />{ts.time}</p>
                            </div>
                          </td>

                        </tr>

                        {/* ── Expanded Detail Row ── */}
                        {isExpanded && (
                          <tr className="bg-gray-50/80">
                            <td colSpan={6} className="px-8 pb-5 pt-1">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-xs">
                                
                                {/* Full log ID + Correlation */}
                                <div className="bg-white rounded-xl p-4 border border-gray-100">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Identifiers</p>
                                  <p className="font-mono text-gray-700 break-all"><span className="text-gray-400">Log:</span> {log.log_id}</p>
                                  {log.correlation_id && <p className="font-mono text-gray-700 break-all mt-1"><span className="text-gray-400">Corr:</span> {log.correlation_id}</p>}
                                  {log.user_id && <p className="font-mono text-gray-700 mt-1"><span className="text-gray-400">UID:</span> {log.user_id}</p>}
                                </div>

                                {/* Description */}
                                {log.description && (
                                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                                    <p className="text-gray-700 leading-relaxed">{log.description}</p>
                                  </div>
                                )}

                                {/* Error */}
                                {(log.error_message || log.error_code) && (
                                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Error</p>
                                    {log.error_code && <p className="font-mono text-red-600 font-bold">{log.error_code}</p>}
                                    {log.error_message && <p className="text-red-600 mt-1">{log.error_message}</p>}
                                  </div>
                                )}

                                {/* User Agent */}
                                {log.user_agent && (
                                  <div className="bg-white rounded-xl p-4 border border-gray-100 md:col-span-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">User Agent / Device</p>
                                    <p className="font-mono text-gray-500 text-[10px] break-all leading-relaxed">{log.user_agent}</p>
                                  </div>
                                )}

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Shield size={13} className="opacity-50" />
            <span>AgriLink Secure Audit Node · Logs are immutable and stored for 90 days · Sensitive fields are masked per privacy policy</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-[#5ba409]" />
            <span>All requests auto-captured via middleware with &lt;1ms overhead</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LogsPage;
