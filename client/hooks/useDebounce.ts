import { useEffect, useState } from "react";

/**
 * Hook debounce giúp trì hoãn việc cập nhật giá trị.
 * @param value Giá trị cần debounce
 * @param delay Thời gian trì hoãn (ms)
 * @returns Giá trị debounce
 */
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
