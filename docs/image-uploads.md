# Image uploads

The admin uploads a photo from the product form. The file goes browser → Cloudinary directly; the server owns the signature, the key and the record. Nothing here is a general media library.

## Environment

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | browser and server | the only value that reaches the client |
| `CLOUDINARY_API_KEY` | server | sent to the browser inside the signed payload, as Cloudinary requires |
| `CLOUDINARY_API_SECRET` | server | signing only, never leaves the process |

`CLOUDINARY_UPLOAD_PRESET`, `NEXT_PUBLIC_IMAGE_PROVIDER` and `NEXT_PUBLIC_IMAGE_CDN` are unused: this flow signs every upload, so there is no unsigned preset to leak.

## The three calls

| Call | Body | Answers |
|---|---|---|
| `POST /api/uploads/sign` | `{ productId?, storeId?, publicId? }` | `{ signature, timestamp, apiKey, cloudName, folder, publicId, key, uploadUrl }` |
| `POST <uploadUrl>` (Cloudinary) | multipart: `file`, `api_key`, `signature`, `timestamp`, `folder`, `public_id` — exactly those six | the asset, whose `secure_url` is the next call's `url` |
| `POST /api/uploads` | `{ key, url, productId?, alt? }` | `201` with the created `ProductImage` row, or `null` when no product was named |
| `DELETE /api/uploads` | `{ key, productId? }` | `200`, or the ownership refusal |

Every refusal answers `{ error }` with this project's Spanish copy and the status the code carries: `401` unauthenticated, `403` forbidden (including another product's photo), `400` a malformed request, `413` too large, `500` a provider failure, `504` a timeout.

## What the server decides, and what the browser cannot

The signature covers `folder`, `public_id` and `timestamp`, all server-chosen inside `products/<scope>` or `stores/<scope>`. The public id is a fresh UUID unless one is supplied, so the browser cannot name a key outside its namespace and two products with the same file name cannot collide. `key` is `${folder}/${publicId}` — exactly what `ImageUpload.key` records.

## Recording and ownership

`POST /api/uploads` upserts the `ImageUpload` row on its unique `key` and, when a product is named, creates one `ProductImage` at the next free position with an `alt` — a repeated key returns the existing row instead of duplicating it. `DELETE` asks the module's ownership rule: an orphan may be deleted by the administrator, a photo listed by another product is refused with a sentence that names that product.

The table cascades from `User`, so it is not an orphan archive: after an owner is deleted the row goes with them, and orphan detection has to compare against the provider.

## Two limits worth knowing

- **The signature scope is the product's slug today**, because a product being created has no row yet; once P4 gives the admin real product rows, the id takes over and the slug stops being an identifier the server trusts for scoping.
- **Size and type are checked in the browser**, before the request, by the same validator the server would use — but the file never reaches the server, so a crafted client can bypass it. Cloudinary applies the account's own limits; a stricter answer belongs with P4, where the asset can be inspected through the Admin API after the fact.
