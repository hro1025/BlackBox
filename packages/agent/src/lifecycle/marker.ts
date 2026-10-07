import { unlink } from "node:fs/promises";

const MARKER_PATH =
  process.env.BLACKBOX_MARKER ??
  `${import.meta.dir}/../storage/blackbox.marker`;

export async function writeMarker(bootId: string): Promise<void> {
  await Bun.write(MARKER_PATH, bootId);
}

export async function readMarker(): Promise<string | undefined> {
  const file = Bun.file(MARKER_PATH);

  if (!(await file.exists())) {
    return undefined;
  }

  const text = await file.text();

  return text.trim();
}

export async function deleteMarker(): Promise<void> {
  await unlink(MARKER_PATH);
}
