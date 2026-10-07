export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function canRetry(error: unknown) {
  if (error instanceof RequestError)
    return error.status >= 500 || [408, 429].includes(error.status);
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name))
  );
}

export const retryDelay = (attempt: number) =>
  Math.min(15000, 3000 * 2 ** Math.min(Math.max(0, attempt - 1), 3));

function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Stopped watching", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

// Only the read callback is retried. Creating a checkout or audit remains a
// separate, explicit action, so a lost response cannot repeat a purchase.
export async function pollForResult<T>({
  read,
  pending,
  onValue,
  onRetry,
  interval = 4000,
  timeout = Infinity,
  signal,
  now = Date.now,
  wait = pause,
}: {
  read: () => Promise<T>;
  pending: (value: T) => boolean;
  onValue: (value: T) => void | Promise<void>;
  onRetry: (error: unknown, attempt: number) => void;
  interval?: number;
  timeout?: number;
  signal?: AbortSignal;
  now?: () => number;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
}) {
  const until = now() + timeout;
  let failures = 0;
  while (now() < until) {
    signal?.throwIfAborted();
    let value: T;
    try {
      value = await read();
    } catch (error) {
      signal?.throwIfAborted();
      if (!canRetry(error)) throw error;
      onRetry(error, ++failures);
      await wait(
        Math.min(retryDelay(failures), Math.max(0, until - now())),
        signal,
      );
      continue;
    }
    signal?.throwIfAborted();
    failures = 0;
    await onValue(value);
    if (!pending(value)) return value;
    await wait(Math.min(interval, Math.max(0, until - now())), signal);
  }
  throw new Error("CHECK_STILL_RUNNING");
}

export function buttonActivity(
  button: HTMLElement,
  active: boolean,
  label?: string,
) {
  button.toggleAttribute("data-busy", active);
  button.setAttribute("aria-busy", String(active));
  if (label) button.textContent = label;
}

export function startActivity(
  container: HTMLElement,
  {
    title,
    detail,
    startedAt = Date.now(),
  }: { title: string; detail: string; startedAt?: number },
) {
  container.hidden = false;
  const spinner = document.createElement("span");
  spinner.className = "work-spinner";
  spinner.setAttribute("aria-hidden", "true");
  const copy = document.createElement("div");
  const heading = document.createElement("strong");
  const description = document.createElement("p");
  const clock = document.createElement("small");
  clock.setAttribute("aria-live", "off");
  copy.append(heading, description, clock);
  container.classList.add("work-status");
  container.replaceChildren(spinner, copy);
  const tick = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    clock.textContent = `Elapsed ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  tick();
  const timer = setInterval(tick, 1000);
  const update = (nextTitle: string, nextDetail: string) => {
    heading.textContent = nextTitle;
    description.textContent = nextDetail;
  };
  update(title, detail);
  return {
    update,
    stop: () => {
      clearInterval(timer);
      container.hidden = true;
    },
  };
}
