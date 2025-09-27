import { useEffect, useState } from "react";

type WindowSize = {
    innerWidth: number;
    innerHeight: number;
};

const getWindowSize = (): WindowSize => {
    if (typeof window === "undefined") {
        return { innerWidth: 0, innerHeight: 0 };
    }

    return { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
};

export function useWindow(): WindowSize {
    const [size, setSize] = useState<WindowSize>(() => getWindowSize());

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleResize = () => {
            setSize(getWindowSize());
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return size;
}

export default useWindow;

