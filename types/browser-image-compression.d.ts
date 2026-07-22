import "browser-image-compression";

/**
 * The shipped .d.ts declares `imageCompression` as always resolving to a
 * `File`. In reality, under `useWebWorker: true`, the compressed result is
 * transferred back from the worker via structured clone, which can strip the
 * `File` prototype off the object, leaving a plain `Blob`. This augmentation
 * widens the return type to match that real behaviour without touching any
 * other declaration from the library.
 */
declare module "browser-image-compression" {
  export default function imageCompression(image: File, options: Options): Promise<File | Blob>;
}
