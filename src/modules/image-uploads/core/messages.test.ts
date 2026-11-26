import { describe, expect, it } from "vitest";

import { imageErrorMessage, IMAGE_ERROR_MESSAGES, IMAGE_ERROR_STATUS } from "./index";
import type { ImageErrorCode } from "./index";

const COPY = {
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
} as const;

describe("the image error copy", () => {
	it("keeps every message byte-identical", () => {
		for (const [code, message] of Object.entries(COPY)) {
			expect(imageErrorMessage(code as ImageErrorCode)).toBe(message);
		}
	});

	it("has a message for every code, and no message without a code", () => {
		expect(Object.keys(IMAGE_ERROR_MESSAGES).sort()).toEqual(Object.keys(IMAGE_ERROR_STATUS).sort());
	});

	it("never repeats a sentence between two codes", () => {
		const messages = Object.values(IMAGE_ERROR_MESSAGES);

		expect(new Set(messages).size).toBe(messages.length);
	});

	it("speaks Spanish, never a code, and never an empty string", () => {
		for (const message of Object.values(IMAGE_ERROR_MESSAGES)) {
			expect(message.trim().length).toBeGreaterThan(0);
			expect(message).not.toMatch(/^[A-Z_]+$/);
		}
	});
});
