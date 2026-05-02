import * as fs from "fs";
import path from "path";

export default abstract class Size {
  public static GetSize(folder: string): number {
    const stats = fs.statSync(folder);

    if (!stats.isDirectory()) {
      return stats.size;
    }

    let total = 0;
    const items = fs.readdirSync(folder, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(folder, item.name);

      if (item.isDirectory()) {
        total += Size.GetSize(fullPath);
      } else {
        total += fs.statSync(fullPath).size;
      }
    }

    return total;
  }
  public static GetAverage(sizes: number[]): number {
    if (sizes.length === 0) {
      return 0;
    }

    const total = sizes.reduce((acc, size) => acc + size, 0);

    return total / sizes.length;
  }
  public static FormatSize(size: number): string {
    switch (true) {
      case size >= 1024 * 1024 * 1024:
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)}GB`;
      case size >= 1024 * 1024:
        return `${(size / (1024 * 1024)).toFixed(2)}MB`;
      case size >= 1024:
        return `${(size / 1024).toFixed(2)}KB`;
      default:
        return `${size}B`;
    }
  }
}
