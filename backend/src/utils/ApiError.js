class ApiError extends Error {
  constructor(StatusCode,message) {
    super(message)
    this.StatusCode = StatusCode
    this.name = 'ApiError'
    Error.captureStackTrace(this, this.constructor)
  }
}
export  default ApiError