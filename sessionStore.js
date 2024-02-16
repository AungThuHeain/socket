/* abstract */ class SessionStore {
  findSession(id) {}
  saveSession(id, session) {}
  findAllSessions() {}
  updateStatus(sessionID, status) {}
}

class InMemorySessionStore extends SessionStore {
  constructor() {
    super();
    this.sessions = new Map();
  }

  findSession(id) {
    return this.sessions.get(id);
  }

  saveSession(id, session) {
    this.sessions.set(id, session);
  }

  findAllSessions() {
    return [...this.sessions.values()];
  }

  updateStatus(sessionID, status) {
    let session = this.findSession(sessionID);
    if (session) {
      session.status = status;
      this.saveSession(sessionID, session);
      return true;
    }
    return false;
  }
}

module.exports = {
  InMemorySessionStore,
};
