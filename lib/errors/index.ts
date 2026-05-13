export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage = "Ocurrio un error inesperado.",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", "Los datos ingresados no son validos.")
    this.name = "ValidationError"
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Not authorized") {
    super(message, "AUTHORIZATION_ERROR", "No tenes permiso para realizar esta accion.")
    this.name = "AuthorizationError"
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string) {
    super(message, "EXTERNAL_SERVICE_ERROR", "No se pudo completar la operacion externa.")
    this.name = "ExternalServiceError"
  }
}

export class MissingEmailError extends AppError {
  constructor(studentId: string) {
    super(`Student ${studentId} has no family email`, "MISSING_EMAIL", "El alumno no tiene email de padre/tutor registrado.")
    this.name = "MissingEmailError"
  }
}

export class ReportCardNotReadyError extends AppError {
  constructor(reportCardId: string) {
    super(`Report card ${reportCardId} is not ready`, "REPORT_CARD_NOT_READY", "El boletin todavia no esta listo para generar.")
    this.name = "ReportCardNotReadyError"
  }
}
