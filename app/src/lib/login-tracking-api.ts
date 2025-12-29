/**
 * Login Tracking API
 * Client-side functions to track login attempts and send to backend
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Device information interface
 */
interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  userAgent?: string;
}

/**
 * Location information interface
 */
interface LocationInfo {
  ip: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
}

/**
 * Track login data interface
 */
interface TrackLoginData {
  device: DeviceInfo;
  location: LocationInfo;
  success?: boolean;
  failureReason?: string;
}

/**
 * Detect device type, browser, and OS from user agent
 */
function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Detect device type
  let type: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (/mobile/i.test(ua) && !/tablet|ipad/i.test(ua)) {
    type = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    type = 'tablet';
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (ua.indexOf('SamsungBrowser') > -1) {
    browser = 'Samsung Internet';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    browser = 'Opera';
  } else if (ua.indexOf('Trident') > -1 || ua.indexOf('MSIE') > -1) {
    browser = 'Internet Explorer';
  } else if (ua.indexOf('Edge') > -1 || ua.indexOf('Edg') > -1) {
    browser = 'Edge';
  } else if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
  }
  
  // Detect OS
  let os = 'Unknown';
  if (ua.indexOf('Win') > -1) {
    if (ua.indexOf('Windows NT 10.0') > -1) {
      os = 'Windows 11';
    } else if (ua.indexOf('Windows NT 6.3') > -1) {
      os = 'Windows 8.1';
    } else if (ua.indexOf('Windows NT 6.2') > -1) {
      os = 'Windows 8';
    } else if (ua.indexOf('Windows NT 6.1') > -1) {
      os = 'Windows 7';
    } else {
      os = 'Windows';
    }
  } else if (ua.indexOf('Mac') > -1) {
    os = 'macOS';
  } else if (ua.indexOf('X11') > -1 || ua.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (ua.indexOf('Android') > -1) {
    os = 'Android';
  } else if (ua.indexOf('like Mac') > -1) {
    os = 'iOS';
  }
  
  return {
    type,
    browser,
    os,
    userAgent: ua,
  };
}

/**
 * Get approximate location based on IP
 * Uses ipapi.co free tier (no API key required)
 * Falls back to 'Unknown' if the service is unavailable
 */
async function getApproximateLocation(): Promise<LocationInfo> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    if (!response.ok) {
      throw new Error('Location service unavailable');
    }
    
    const data = await response.json();
    
    // Anonymize IP (mask last octet for privacy)
    const anonymizedIP = anonymizeIP(data.ip || 'Unknown');
    
    return {
      ip: anonymizedIP,
      city: data.city || 'Unknown',
      state: data.region || 'Unknown',
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'XX',
    };
  } catch (error) {
    console.warn('Failed to get location:', error);
    // Return default values if location service fails
    return {
      ip: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      countryCode: 'XX',
    };
  }
}

/**
 * Anonymize IP address by masking the last octet
 * Example: 192.168.1.1 -> 192.168.1.x
 */
function anonymizeIP(ip: string): string {
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = 'x';
      return parts.join('.');
    }
  }
  
  // IPv6 - mask last 64 bits
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length > 4) {
      // Keep first 64 bits (first 4 groups), mask the rest
      return parts.slice(0, 4).join(':') + '::xxxx';
    }
  }
  
  return ip;
}

/**
 * Track a successful login
 * Detects device and location information and sends to backend
 * @returns Promise that resolves when tracking is complete
 */
export async function trackSuccessfulLogin(): Promise<void> {
  try {
    // Detect device
    const device = detectDevice();
    
    // Get location (with timeout)
    const location = await getApproximateLocation();
    
    // Call Cloud Function
    const trackLoginFn = httpsCallable<TrackLoginData, { success: boolean; message: string }>(
      functions,
      'trackLogin'
    );
    
    await trackLoginFn({
      device,
      location,
      success: true,
    });
    
    console.log('✓ Login tracked successfully');
  } catch (error: any) {
    // Silently fail if function not deployed yet (CORS error or not-found)
    // This prevents console errors during development before function is deployed
    if (error?.code === 'functions/not-found' || 
        error?.message?.includes('CORS') ||
        error?.message?.includes('Failed to fetch')) {
      // Function not deployed yet - fail silently
      return;
    }
    
    // Log other errors for debugging
    console.warn('Login tracking unavailable:', error?.message || error);
  }
}

/**
 * Track a failed login attempt
 * @param failureReason - Reason for login failure
 */
export async function trackFailedLogin(failureReason: string): Promise<void> {
  try {
    // Detect device
    const device = detectDevice();
    
    // Get location (with timeout)
    const location = await getApproximateLocation();
    
    // Call Cloud Function
    const trackLoginFn = httpsCallable<TrackLoginData, { success: boolean; message: string }>(
      functions,
      'trackLogin'
    );
    
    await trackLoginFn({
      device,
      location,
      success: false,
      failureReason,
    });
    
    console.log('✓ Failed login tracked');
  } catch (error: any) {
    // Silently fail if function not deployed yet
    if (error?.code === 'functions/not-found' || 
        error?.message?.includes('CORS') ||
        error?.message?.includes('Failed to fetch')) {
      return;
    }
    
    console.warn('Failed login tracking unavailable:', error?.message || error);
  }
}
