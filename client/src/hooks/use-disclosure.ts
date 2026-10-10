import { useState } from "react";

/**
 * A simple disclosure (toggle) hook.
 */
export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen: (value: boolean) => {
      setIsOpen(value);
    },
    setOpenNoSignal: (value: boolean) => {
      setIsOpen(value);
    },
  };
}

export default useDisclosure;
