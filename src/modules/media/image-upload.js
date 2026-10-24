import { IMAGE_UPLOAD } from "@/constants/image-upload";

const signatures = {
  "image/png": (bytes) => bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (bytes) => bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/webp": (bytes) => bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
};

export function isValidImage(bytes, contentType) {
  return bytes.length > 0 && bytes.length <= IMAGE_UPLOAD.maxBytes && Boolean(signatures[contentType]?.(bytes));
}
