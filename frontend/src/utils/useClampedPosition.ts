import { useLayoutEffect, useRef, useState } from 'react';

export interface Anchor {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export function useClampedPosition(anchor: Anchor | null, gap = 8, margin = 8) {
    const ref = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<{ left: number; top: number } | undefined>(undefined);

    useLayoutEffect(() => {
        if (!anchor || !ref.current) { setStyle(undefined); return; }
        const rect = ref.current.getBoundingClientRect();

        let top = anchor.bottom + gap;
        if (top + rect.height > window.innerHeight - margin) {
            const above = anchor.top - gap - rect.height;
            top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - rect.height);
        }

        let left = anchor.left;
        if (left + rect.width > window.innerWidth - margin) left = window.innerWidth - margin - rect.width;
        if (left < margin) left = margin;

        setStyle({ left, top });
    }, [anchor, gap, margin]);

    return { ref, style };
}
