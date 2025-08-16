import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix = 'screen-link', level = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setVerbose(verbose: boolean) {
    this.level = verbose ? LogLevel.VERBOSE : LogLevel.INFO;
  }

  error(message: string, ...args: any[]) {
    if (this.level >= LogLevel.ERROR) {
      console.error(chalk.red(`[${this.prefix}:ERROR]`), message, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.level >= LogLevel.WARN) {
      console.warn(chalk.yellow(`[${this.prefix}:WARN]`), message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.level >= LogLevel.INFO) {
      console.info(chalk.blue(`[${this.prefix}:INFO]`), message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(chalk.gray(`[${this.prefix}:DEBUG]`), message, ...args);
    }
  }

  verbose(message: string, ...args: any[]) {
    if (this.level >= LogLevel.VERBOSE) {
      console.log(chalk.gray(`[${this.prefix}:VERBOSE]`), message, ...args);
    }
  }

  success(message: string, ...args: any[]) {
    console.log(chalk.green(`[${this.prefix}:SUCCESS]`), message, ...args);
  }

  // Utility methods for specific use cases
  startSection(title: string) {
    if (this.level >= LogLevel.INFO) {
      console.log(chalk.cyan(`\n=== ${title} ===`));
    }
  }

  endSection() {
    if (this.level >= LogLevel.INFO) {
      console.log();
    }
  }

  progress(current: number, total: number, item?: string) {
    if (this.level >= LogLevel.INFO) {
      const percentage = Math.round((current / total) * 100);
      const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
      const itemText = item ? ` - ${item}` : '';
      process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total})${itemText}`);
      
      if (current === total) {
        console.log(); // New line when complete
      }
    }
  }

  table(data: Record<string, any>[]) {
    if (this.level >= LogLevel.INFO && data.length > 0) {
      const keys = Object.keys(data[0]);
      const widths = keys.map(key => 
        Math.max(key.length, ...data.map(row => String(row[key] || '').length))
      );

      // Header
      const header = keys.map((key, i) => key.padEnd(widths[i])).join(' | ');
      console.log(chalk.cyan(header));
      console.log(chalk.cyan('-'.repeat(header.length)));

      // Rows
      data.forEach(row => {
        const rowStr = keys.map((key, i) => 
          String(row[key] || '').padEnd(widths[i])
        ).join(' | ');
        console.log(rowStr);
      });
    }
  }
}

// Global logger instance
export const logger = new Logger();