import type { ImageErrorCode } from "./errors";

export const IMAGE_ERROR_MESSAGES: Record<ImageErrorCode, string> = {
	UNAUTHENTICATED: "No autorizado",
	FORBIDDEN: "No tienes permiso para realizar esta acción",
	NO_FILE: "No se proporcionó archivo",
	INVALID_TYPE: "El archivo debe ser una imagen",
	TOO_LARGE: "La foto pesa demasiado. Probá con una más liviana.",
	MISSING_KEY: "No se proporcionó key",
	PATH_MISSING: "Ruta de imagen no proporcionada",
	NOT_FOUND: "Imagen no encontrada",
	PROVIDER_UNKNOWN: "Proveedor de imagen no soportado",
	MISCONFIGURED: "La configuración del almacenamiento de imágenes está incompleta",
	UPLOAD_FAILED: "Error al subir la imagen",
	DELETE_FAILED: "Error al eliminar la imagen",
	UPSTREAM_FAILED: "Error al obtener la imagen",
	TIMEOUT: "La imagen tardó demasiado en responder",
};

export function imageErrorMessage(code: ImageErrorCode): string {
	return IMAGE_ERROR_MESSAGES[code];
}
