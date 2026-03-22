export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  public issues: Array<{ path: string; message: string }>;

  constructor(message: string, issues: Array<{ path: string; message: string }> = []) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class DuplicateError extends Error {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} "${value}" already exists`);
    this.name = 'DuplicateError';
  }
}
