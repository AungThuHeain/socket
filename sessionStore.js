/* abstract */ class SessionStore {
  findSession(id) {}
  saveSession(id, session) {}
  findAllSessions() {}
  updateStatus(sessionID, status) {}
  updateConnected(sessionID, connected) {}
  deleteSession(sessionID) {}
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

  updateStatus(userID, update_data) {
    let session = this.findSession(userID);

    if (session) {
      session.status = update_data.session_status;
      session.agentID = update_data.agent_id;
      this.saveSession(userID, session);
      return true;
    }
    return false;
  }

  updateConnectedStatus(userID, connected) {
    let session = this.findSession(userID);
    if (session) {
      session.connected = connected;
      this.saveSession(userID, session);
      return true;
    }
    return false;
  }

  deleteSession(userID) {
    this.sessions.delete(userID);
  }
}

module.exports = {
  InMemorySessionStore,
};
