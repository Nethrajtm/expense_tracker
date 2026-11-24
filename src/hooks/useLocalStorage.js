import { useState, useEffect, useRef } from "react";

/**
 * Custom React hook for synchronized localStorage persistence with debounced writes.
 *
 * @param {string} key - The localStorage key name
 * @param {any} initialValue - Fallback initial value if no valid data is stored
 * @param {number} debounceMs - Debounce interval in ms (default: 300ms)
 * @returns {[any, Function]} - [storedValue, setStoredValue]
 */
export function useLocalStorage(key, initialValue, debounceMs = 300) {
  // 1. Safe read on mount / initial state
  const [value, setValue] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item !== null && item !== undefined && item !== "") {
          const parsed = JSON.parse(item);
          // Safety validation: if initialValue was an array, verify parsed is an array
          if (Array.isArray(initialValue) && !Array.isArray(parsed)) {
            return initialValue;
          }
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error parsing localStorage key "${key}":`, error);
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  const valueRef = useRef(value);
  valueRef.current = value;
  const isFirstRender = useRef(true);

  // 2. Debounced write to localStorage
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Populate localStorage if it was empty
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const existing = window.localStorage.getItem(key);
          if (existing === null) {
            window.localStorage.setItem(key, JSON.stringify(value));
          }
        }
      } catch (err) {
        console.warn(`[useLocalStorage] Initial write failed for "${key}":`, err);
      }
      return;
    }

    const handler = setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error(`[useLocalStorage] Error saving key "${key}":`, error);
      }
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [key, value, debounceMs]);

  // 3. Flush on beforeunload so immediate reloads persist changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, JSON.stringify(valueRef.current));
        }
      } catch (e) {
        // silently catch on unload
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, JSON.stringify(valueRef.current));
        }
      } catch (e) {
        // silently catch on unmount
      }
    };
  }, [key]);

  return [value, setValue];
}

export default useLocalStorage;
