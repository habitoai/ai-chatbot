/**
 * Custom error class for Chat SDK errors
 */
export class ChatSDKError extends Error {
  statusCode: number;
  surface: string;
  digest: string;
  cause?: string;

  constructor(
    type: string,
    message: string,
    cause?: string
  ) {
    super(message);
    this.name = 'ChatSDKError';
    
    // Parse the type (format: 'surface:errorType')
    const [surface, errorType] = type.split(':');
    this.surface = surface;
    
    // Set status code based on error type
    switch (errorType) {
      case 'unauthorized':
        this.statusCode = 401;
        break;
      case 'forbidden':
        this.statusCode = 403;
        break;
      case 'not_found':
        this.statusCode = 404;
        break;
      case 'database':
      case 'validation':
        this.statusCode = 400;
        break;
      default:
        this.statusCode = 500;
    }
    
    // Generate a simple digest for error tracking
    this.digest = String(Math.floor(Math.random() * 10000000000));
    
    if (cause) {
      this.cause = cause;
    }
  }
}
