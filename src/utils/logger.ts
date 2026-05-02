import chalk from "chalk";

export default abstract class Logger {
  public static Info(...args: any[]): void {
    console.log(
      this.GetTime(),
      chalk.gray("[") + chalk.cyan("INFO") + chalk.gray("]"),
      ...this.MapArgs(args),
    );
  }
  public static Notice(...args: any[]): void {
    console.log(
      this.GetTime(),
      chalk.gray("[") + chalk.greenBright("NOTICE") + chalk.gray("]"),
      ...this.MapArgs(args),
    );
  }
  public static Warn(...args: any[]): void {
    console.warn(
      this.GetTime(),
      chalk.gray("[") + chalk.yellow("WARN") + chalk.gray("]"),
      ...this.MapArgs(args),
    );
  }
  public static Fatal(...args: any[]): void {
    console.error(
      this.GetTime(),
      chalk.gray("[") + chalk.red("FATAL") + chalk.gray("]"),
      ...this.MapArgs(args),
    );

    process.exit(1);
  }

  public static Custom(title: string, ...args: any[]): void {
    console.log(
      this.GetTime(),
      chalk.gray("[") + title + chalk.gray("]"),
      ...this.MapArgs(args),
    );
  }

  private static GetTime(): string {
    const date = new Date();
    const time = `[${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}]`;

    return chalk.whiteBright(time);
  }
  private static MapArgs(args: any[]): string[] {
    return args.map((arg) => this.FormatValue(arg));
  }
  private static FormatValue(value: any): string {
    switch (typeof value) {
      case "string":
        return chalk.green(value);
      case "bigint":
        return chalk.cyan(value.toString());
      case "number":
        return chalk.cyan(value.toString());
      case "boolean":
        return chalk.magenta(value.toString());
      case "function":
        return chalk.magentaBright(value.toString());
      case "object":
        return chalk.blue(JSON.stringify(value));
      case "symbol":
        return chalk.yellow(value.toString());
      case "undefined":
        return chalk.gray("undefined");
    }
  }
}
