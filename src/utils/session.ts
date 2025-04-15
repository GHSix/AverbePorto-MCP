// Session store for cookies
export interface SessionData {
  cookie: string;
  userName: string;
  expiresAt: number;
}

class SessionStore {
  private sessions: Map<string, SessionData> = new Map();

  set(sessionId: string, data: SessionData): void {
    this.sessions.set(sessionId, data);
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session && session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Clean up expired sessions
  cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  // Get total active sessions count
  get activeCount(): number {
    this.cleanup(); // Clean up expired sessions first
    return this.sessions.size;
  }
}

// Create and export singleton instance
export const sessionStore = new SessionStore();

// Start periodic cleanup every hour
setInterval(() => {
  sessionStore.cleanup();
}, 60 * 60 * 1000);