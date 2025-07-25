const ms = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

export const tfMs = (tf: string, numTfs: number = 1): number => {
  const num = parseInt(tf);
  if (tf.endsWith("m")) return num * ms.m * numTfs;
  if (tf.endsWith("h")) return num * ms.h * numTfs;
  if (tf.endsWith("d")) return num * ms.d * numTfs;
  throw new Error(`Unsupported timeframe: ${tf}`);
};

export const tfClamp = (
  tf: string,
  baseTime: number = Date.now(),
  addTfs: number = 0
): number => {
  const ms = tfMs(tf);
  const baseTimeMs = Math.floor(baseTime / ms) * ms;
  return baseTimeMs + addTfs * ms;
};

export const tfDist = (
  tf: string,
  startTime: number,
  endTime: number
): number => {
  return Math.floor(endTime - startTime / tfMs(tf));
};

export const ftime = (v: number | Date = new Date()) =>
  new Date(v).toJSON().substring(0, 16).replace("T", " ");
