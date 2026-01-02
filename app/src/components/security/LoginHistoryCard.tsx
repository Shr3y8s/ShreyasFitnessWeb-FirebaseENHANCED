'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoginHistoryItem } from './LoginHistoryItem';
import { 
  getMyLoginHistory, 
  getLoginHistoryStats, 
  detectSuspiciousActivity,
  exportLoginHistory 
} from '@/lib/login-history-api';
import { LoginHistoryEntry, LoginHistoryStats } from '@/types/login-history';
import { History, AlertTriangle, Download, Loader2 } from 'lucide-react';

export function LoginHistoryCard() {
  const { toast } = useToast();
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [stats, setStats] = useState<LoginHistoryStats | null>(null);
  const [suspicious, setSuspicious] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const [historyData, statsData] = await Promise.all([
        getMyLoginHistory(30),
        getLoginHistoryStats()
      ]);
      
      setHistory(historyData);
      setStats(statsData);
      
      const suspiciousData = detectSuspiciousActivity(historyData);
      setSuspicious(suspiciousData);
    } catch (error) {
      console.error('Error loading login history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportLoginHistory();
    } catch (error) {
      console.error('Error exporting history:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayHistory = showAll ? history : history.slice(0, 5);

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Login History
          </CardTitle>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Suspicious Activity Alert */}
        {suspicious.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">
                  Suspicious Activity Detected
                </h4>
                <p className="text-sm text-amber-800 mb-3">
                  We noticed {suspicious.length} suspicious login {suspicious.length === 1 ? 'attempt' : 'attempts'} 
                  in the last 7 days. If this wasn't you, please change your password immediately.
                </p>
                <button className="text-sm font-medium text-amber-900 hover:text-amber-700 underline">
                  Change Password →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-primary">{stats.totalLogins}</div>
              <div className="text-xs text-gray-600">Total Logins</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{stats.successfulLogins}</div>
              <div className="text-xs text-gray-600">Successful</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{stats.failedLogins}</div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{stats.uniqueLocations}</div>
              <div className="text-xs text-gray-600">Locations</div>
            </div>
          </div>
        )}

        {/* Most Used Device */}
        {stats && (
          <div className="text-sm text-gray-600">
            <strong>Most used device:</strong> {stats.mostUsedDevice}
          </div>
        )}

        {/* History List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">
            Recent Activity (Last 30 Days)
          </h3>
          
          {displayHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No login history available yet.
            </p>
          ) : (
            <>
              {displayHistory.map(entry => (
                <LoginHistoryItem
                  key={entry.id}
                  entry={entry}
                  suspicious={suspicious.some(s => s.id === entry.id)}
                />
              ))}

              {/* Show More/Less Button */}
              {history.length > 5 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full py-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  {showAll ? 'Show Less' : `Show All (${history.length} entries)`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Info Text */}
        <div className="text-xs text-gray-500 pt-4 border-t">
          <p>
            Login history is automatically tracked for security purposes. 
            Records are kept for 90 days and IP addresses are anonymized.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
