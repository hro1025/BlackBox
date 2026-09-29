const file = Bun.file("/proc/meminfo");
const text = await file.text();

function parseMemoryInfo(text: string) {
  const lines = text.split("\n");

  const values: Record<string, number> = {};

  for (const line of lines) {
    const [key, value] = line.replace(/:/, " ").trim().split(/\s+/, 2);

    if (key !== undefined && value !== undefined) {
      values[key] = Number.parseInt(value);
    }
  }
  return values;
}
console.log(parseMemoryInfo(text));
