const MARKER_PATH =
  process.env.BLACKBOX_MARKER ??
  `${import.meta.dir}/../storage/blackbox.marker`;

export async function writeMarker(bootId: string): Promise<void> {
  await Bun.write(MARKER_PATH, bootId);
}
