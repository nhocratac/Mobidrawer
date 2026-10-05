import type { BatchEvent } from "./types";

export interface SeqSyncDeps {
  apply: (ev: BatchEvent) => void;
  reload: () => Promise<number>; // resolve historySeq sau khi đã reset store
  gapWaitMs?: number; // mặc định 500
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

export interface SeqSync {
  onBatch(ev: BatchEvent): void;
  setBaseline(seq: number): void;
  lastSeq(): number;
  isReloading(): boolean;
  dispose(): void;
}

// Áp batch đúng thứ tự seq; chỉ reload khi hụt seq mà không tiến triển trong gapWaitMs
export function createSeqSync(deps: SeqSyncDeps): SeqSync {
  const gapWaitMs = deps.gapWaitMs ?? 500;
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number): unknown => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let last = 0;
  let buffer: BatchEvent[] = [];
  let timer: unknown = null;
  let reloading = false;
  let disposed = false;

  function stopTimer() {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();
    timer = setTimer(onGapTimeout, gapWaitMs);
  }

  // Áp các batch liền mạch trong buffer; có tiến triển mà vẫn hụt thì tính lại thời gian chờ
  function drain() {
    buffer.sort((a, b) => a.seqFrom - b.seqFrom);
    let progressed = false;
    while (buffer.length) {
      const ev = buffer[0];
      if (ev.seqTo <= last) {
        buffer.shift();
        continue;
      }
      if (ev.seqFrom > last + 1) break;
      buffer.shift();
      deps.apply(ev);
      last = ev.seqTo;
      progressed = true;
    }
    if (!buffer.length) stopTimer();
    else if (progressed || timer === null) startTimer();
  }

  function onGapTimeout() {
    timer = null;
    if (disposed || reloading || !buffer.length) return;
    reloading = true;
    deps.reload().then(
      (seq) => {
        if (disposed) return;
        reloading = false;
        last = seq;
        drain();
      },
      () => {
        if (disposed) return;
        // reload lỗi: giữ lastSeq, buffer còn hụt thì chờ rồi thử lại
        reloading = false;
        drain();
      },
    );
  }

  return {
    onBatch(ev) {
      if (disposed || ev.seqTo <= last) return;
      buffer.push(ev);
      // đang reload: chỉ buffer, reload xong mới áp
      if (!reloading) drain();
    },
    setBaseline(seq) {
      last = seq;
      stopTimer();
      if (!reloading) drain();
    },
    lastSeq: () => last,
    isReloading: () => reloading,
    dispose() {
      disposed = true;
      stopTimer();
      buffer = [];
    },
  };
}
