export function createRetryWorker({ maxAttempts = 3 } = {}) {
  const queue = [];
  const deadLetters = [];
  return {
    enqueue(job) {
      queue.push({ ...job, attempts: 0 });
    },
    processNext({ fail = false } = {}) {
      const job = queue.shift();
      if (!job) return { status: "idle" };
      job.attempts += 1;
      if (!fail) return { status: "delivered", job };
      queue.push(job);
      return { status: "retrying", job };
    },
    status() {
      return { queue: structuredClone(queue), deadLetters: structuredClone(deadLetters), maxAttempts };
    }
  };
}
