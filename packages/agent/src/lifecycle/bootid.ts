const BOOT_ID_PATH = "/proc/sys/kernel/random/boot_id";
const LAST_BOOT_ID_PATH =
  process.env.BLACKBOX_LAST_BOOT_ID ??
  `${import.meta.dir}/../storage/blackbox.bootid`;

export async function readBootId(): Promise<string> {
  const file = Bun.file(BOOT_ID_PATH);
  const text = await file.text();

  return text.trim();
}

export async function readLastBootId(): Promise<string | undefined> {
  const file = Bun.file(LAST_BOOT_ID_PATH);

  if (!(await file.exists())) {
    return undefined;
  }

  const text = await file.text();

  return text.trim();
}

export async function writeLastBootId(bootId: string): Promise<void> {
  await Bun.write(LAST_BOOT_ID_PATH, bootId);
}
