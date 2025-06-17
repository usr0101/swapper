// Security monitoring and alerting system

interface SecurityEvent {
  type: 'FAILED_TRANSACTION' | 'SUSPICIOUS_ACTIVITY' | 'UNAUTHORIZED_ACCESS' | 'API_ABUSE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: any;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private alertThresholds = {
    FAILED_TRANSACTION: { count: 5, windowMs: 60000 }, // 5 failures in 1 minute
    SUSPICIOUS_ACTIVITY: { count: 3, windowMs: 30000 }, // 3 suspicious actions in 30 seconds
    UNAUTHORIZED_ACCESS: { count: 1, windowMs: 1000 }, // Immediate alert
    API_ABUSE: { count: 100, windowMs: 60000 }, // 100 requests in 1 minute
  };

  logEvent(event: Omit<SecurityEvent, 'timestamp' | 'sessionId'>) {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
    };

    this.events.push(fullEvent);
    this.checkAlerts(fullEvent);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('security_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('security_session_id', sessionId);
    }
    return sessionId;
  }

  private checkAlerts(event: SecurityEvent) {
    const threshold = this.alertThresholds[event.type];
    if (!threshold) return;

    const windowStart = Date.now() - threshold.windowMs;
    const recentEvents = this.events.filter(
      e => e.type === event.type && 
           new Date(e.timestamp).getTime() > windowStart
    );

    if (recentEvents.length >= threshold.count) {
      this.triggerAlert(event.type, recentEvents);
    }
  }

  private triggerAlert(type: SecurityEvent['type'], events: SecurityEvent[]) {
    const alert = {
      type: 'SECURITY_ALERT',
      alertType: type,
      eventCount: events.length,
      timeWindow: this.alertThresholds[type].windowMs,
      events: events.slice(-5), // Last 5 events
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    console.warn('🚨 SECURITY ALERT:', alert);

    // In production, send to monitoring service
    if (import.meta.env.VITE_SOLANA_NETWORK === 'mainnet-beta') {
      this.sendToMonitoringService(alert);
    }

    // Show user notification for critical alerts
    if (events[0]?.severity === 'CRITICAL') {
      this.showUserAlert(type);
    }
  }

  private sendToMonitoringService(alert: any) {
    // Implementation would send to external monitoring service
    // For now, just log
    console.error('MONITORING SERVICE:', alert);
  }

  private showUserAlert(type: SecurityEvent['type']) {
    const messages = {
      FAILED_TRANSACTION: 'Multiple transaction failures detected. Please check your wallet and try again.',
      SUSPICIOUS_ACTIVITY: 'Unusual activity detected. Please verify your actions.',
      UNAUTHORIZED_ACCESS: 'Unauthorized access attempt detected. Please secure your account.',
      API_ABUSE: 'Too many requests detected. Please slow down.',
    };

    // Show non-blocking notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Security Alert', {
        body: messages[type],
        icon: '/favicon.ico',
      });
    }
  }

  getSecurityReport() {
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentEvents = this.events.filter(
      e => new Date(e.timestamp).getTime() > last24Hours
    );

    const report = {
      totalEvents: recentEvents.length,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      suspiciousPatterns: this.detectPatterns(recentEvents),
      recommendations: this.generateRecommendations(recentEvents),
    };

    recentEvents.forEach(event => {
      report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1;
      report.eventsBySeverity[event.severity] = (report.eventsBySeverity[event.severity] || 0) + 1;
    });

    return report;
  }

  private detectPatterns(events: SecurityEvent[]) {
    const patterns = [];

    // Detect rapid-fire failures
    const failures = events.filter(e => e.type === 'FAILED_TRANSACTION');
    if (failures.length > 10) {
      patterns.push({
        type: 'RAPID_FAILURES',
        count: failures.length,
        description: 'High number of transaction failures',
      });
    }

    // Detect unusual access patterns
    const accessEvents = events.filter(e => e.type === 'UNAUTHORIZED_ACCESS');
    if (accessEvents.length > 0) {
      patterns.push({
        type: 'UNAUTHORIZED_ATTEMPTS',
        count: accessEvents.length,
        description: 'Unauthorized access attempts detected',
      });
    }

    return patterns;
  }

  private generateRecommendations(events: SecurityEvent[]) {
    const recommendations = [];

    if (events.some(e => e.type === 'FAILED_TRANSACTION')) {
      recommendations.push('Review transaction parameters and wallet balance');
    }

    if (events.some(e => e.type === 'API_ABUSE')) {
      recommendations.push('Implement stricter rate limiting');
    }

    if (events.some(e => e.severity === 'CRITICAL')) {
      recommendations.push('Immediate security review required');
    }

    return recommendations;
  }
}

export const securityMonitor = new SecurityMonitor();

// Helper functions for common security events
export const logFailedTransaction = (error: any, details: any) => {
  securityMonitor.logEvent({
    type: 'FAILED_TRANSACTION',
    severity: 'MEDIUM',
    details: {
      error: error.message,
      code: error.code,
      ...details,
    },
  });
};

export const logSuspiciousActivity = (activity: string, details: any) => {
  securityMonitor.logEvent({
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'HIGH',
    details: {
      activity,
      ...details,
    },
  });
};

export const logUnauthorizedAccess = (attempt: string, details: any) => {
  securityMonitor.logEvent({
    type: 'UNAUTHORIZED_ACCESS',
    severity: 'CRITICAL',
    details: {
      attempt,
      ...details,
    },
  });
};

export const logAPIAbuse = (endpoint: string, details: any) => {
  securityMonitor.logEvent({
    type: 'API_ABUSE',
    severity: 'MEDIUM',
    details: {
      endpoint,
      ...details,
    },
  });
};

// Request notification permission on app start
export const initializeSecurityMonitoring = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};