export class ApiError extends Error {
    status;
    code;
    context;
    rawResponse;
    constructor(message, status, code, context, rawResponse) {
        super(message);
        this.status = status;
        this.code = code;
        this.context = context;
        this.rawResponse = rawResponse;
        this.name = 'ApiError';
    }
}
export class ValidationError extends Error {
    field;
    value;
    constructor(message, field, value) {
        super(message);
        this.field = field;
        this.value = value;
        this.name = 'ValidationError';
    }
}
export class SessionError extends Error {
    sessionId;
    constructor(message, sessionId) {
        super(message);
        this.sessionId = sessionId;
        this.name = 'SessionError';
    }
}
