import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

/**
 * Debounced auto-save hook.
 * saveFn must throw on version conflict (409) or other error.
 * On 409, it should throw an error with message 'conflict'.
 */
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay = 6000
) {
  const [status, setStatus] = useState<Status>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef(data);

  useEffect(() => { latestData.current = data; }, [data]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFn(latestData.current);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 3000);
      } catch (err: any) {
        if (err?.response?.status === 409 || err?.message === 'conflict') {
          setStatus('conflict');
        } else {
          setStatus('error');
        }
      }
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data]);

  return status;
}