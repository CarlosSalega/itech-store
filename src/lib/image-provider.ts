import {
	cloudinaryConfigFromEnv,
	createCloudinaryProvider,
} from "@/modules/image-uploads/provider/cloudinary";
import type { ImageUploadProvider } from "@/modules/image-uploads/provider/cloudinary";

let provider: ImageUploadProvider | undefined;

export function getImageProvider(): ImageUploadProvider {
	provider ??= createCloudinaryProvider(cloudinaryConfigFromEnv(process.env));

	return provider;
}
