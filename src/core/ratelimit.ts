import chalk from 'chalk';

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const randomDelay = async (minMs: number = 1500, maxMs: number = 3500): Promise<number> => {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await sleep(delay);
  return delay;
};

export const handleRateLimit = async (
  isRateLimited: boolean,
  cooldownSeconds: number = 60,
  onProgress?: (remaining: number) => void
): Promise<void> => {
  if (!isRateLimited) return;

  console.log(
    chalk.yellow.bold(
      `\n⚠️  Rate limit / Action cooldown detected. Pausing for ${cooldownSeconds}s to protect account...`
    )
  );

  for (let s = cooldownSeconds; s > 0; s--) {
    if (onProgress) {
      onProgress(s);
    }
    await sleep(1000);
  }

  console.log(chalk.green('✅ Cooldown complete. Resuming operations...\n'));
};
