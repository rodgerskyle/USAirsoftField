import { useEffect, useState } from 'react';

export default function useFieldResources() {
  const [result, setResult] = useState({ resources: null, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${process.env.PUBLIC_URL}/field-resources.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Field resources are unavailable.');
        return response.json();
      })
      .then(resources => {
        if (resources?.schemaVersion !== 1) throw new Error('Invalid field resources.');
        if (!controller.signal.aborted) setResult({ resources, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ resources: null, failed: true });
      });
    return () => controller.abort();
  }, []);

  return result;
}
