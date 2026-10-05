const BOOT_ID_PATH = "/proc/sys/kernel/random/boot_id";

export async function readBootId(): Promise<string> {
  const file = Bun.file(BOOT_ID_PATH);
  const text = await file.text();

  return text.trim();
}
