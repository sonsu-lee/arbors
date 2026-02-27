export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RuntimeAdapter {
  /** Run a command with arguments (no shell, safe from injection) */
  exec(cmd: string, args: string[]): Promise<ExecResult>;
  glob(pattern: string, cwd: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyFile(src: string, dest: string): Promise<void>;
  mkdir(path: string): Promise<void>;
}
