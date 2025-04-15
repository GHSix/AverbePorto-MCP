class SessionStore {
    sessions = new Map();
    set(sessionId, data) {
        this.sessions.set(sessionId, data);
    }
    get(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session && session.expiresAt < Date.now()) {
            this.sessions.delete(sessionId);
            return undefined;
        }
        return session;
    }
    delete(sessionId) {
        this.sessions.delete(sessionId);
    }
    // Clean up expired sessions
    cleanup() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(id);
            }
        }
    }
    // Get total active sessions count
    get activeCount() {
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
