import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { LoginHistoryEntry, LoginHistoryStats } from '@/types/login-history';

export async function getMyLoginHistory(limitCount: number = 30): Promise<LoginHistoryEntry[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const q = query(
    collection(db, 'login_history'),
    where('userId', '==', user.uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as LoginHistoryEntry));
}

export async function getLoginHistoryStats(): Promise<LoginHistoryStats> {
  const history = await getMyLoginHistory(100); // Get more for stats
  
  const successful = history.filter(h => h.success);
  const failed = history.filter(h => !h.success);
  
  // Count unique locations
  const uniqueLocations = new Set(
    history.map(h => `${h.location.city}, ${h.location.state}`)
  ).size;
  
  // Find most used device
  const deviceCounts = history.reduce((acc, h) => {
    const device = `${h.device.browser} on ${h.device.type}`;
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostUsedDevice = Object.entries(deviceCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
  
  return {
    totalLogins: history.length,
    successfulLogins: successful.length,
    failedLogins: failed.length,
    uniqueLocations,
    mostUsedDevice,
    lastLogin: history[0]?.timestamp.toDate(),
  };
}

export function detectSuspiciousActivity(history: LoginHistoryEntry[]): LoginHistoryEntry[] {
  const suspicious: LoginHistoryEntry[] = [];
  
  // Only analyze if there's enough history (at least 5 successful logins)
  const successfulLogins = history.filter(h => h.success);
  if (successfulLogins.length < 5) {
    // Not enough data to establish patterns - only flag failed attempts
    const recentFailed = history.filter(h => 
      !h.success && 
      (Date.now() - h.timestamp.toMillis()) < 7 * 24 * 60 * 60 * 1000
    );
    
    if (recentFailed.length >= 5) {
      suspicious.push(...recentFailed);
    }
    
    return suspicious;
  }
  
  // Check for multiple failed login attempts (more strict threshold)
  const recentFailed = history.filter(h => 
    !h.success && 
    (Date.now() - h.timestamp.toMillis()) < 7 * 24 * 60 * 60 * 1000
  );
  
  if (recentFailed.length >= 5) {
    suspicious.push(...recentFailed);
  }
  
  // Check for unusual locations (only after establishing baseline)
  const userLocations = successfulLogins.map(h => h.location.city);
  
  const locationFrequency = userLocations.reduce((acc, loc) => {
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // A location is "common" if used 3+ times
  const commonLocations = Object.entries(locationFrequency)
    .filter(([, count]) => count >= 3)
    .map(([loc]) => loc);
  
  // Only flag unusual locations if we have established common locations
  if (commonLocations.length > 0) {
    const unusualLogins = history.filter(h => 
      h.success && 
      !commonLocations.includes(h.location.city) &&
      (Date.now() - h.timestamp.toMillis()) < 7 * 24 * 60 * 60 * 1000
    );
    
    suspicious.push(...unusualLogins);
  }
  
  return suspicious;
}

export async function exportLoginHistory(): Promise<void> {
  const history = await getMyLoginHistory(1000);
  
  // Convert to CSV
  const csvHeader = 'Date,Time,Status,Device,Browser,Location,IP\n';
  const csvRows = history.map(entry => {
    const date = entry.timestamp.toDate();
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();
    const status = entry.success ? 'Success' : `Failed (${entry.failureReason})`;
    const device = `${entry.device.type}`;
    const browser = entry.device.browser;
    const location = `${entry.location.city}, ${entry.location.state}, ${entry.location.country}`;
    const ip = entry.location.ip;
    
    return `"${dateStr}","${timeStr}","${status}","${device}","${browser}","${location}","${ip}"`;
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `login-history-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
