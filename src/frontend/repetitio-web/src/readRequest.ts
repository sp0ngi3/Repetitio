export async function fetchRead(url: string, init?: RequestInit): Promise<Response> {
  const delays = [250, 500, 1000, 2000];
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, init);
      if (![502, 503, 504].includes(response.status) || attempt >= delays.length) return response;
      await response.body?.cancel();
    } catch (error) {
      if (!(error instanceof TypeError) || init?.signal?.aborted || attempt >= delays.length) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    init?.signal?.throwIfAborted();
  }
}
