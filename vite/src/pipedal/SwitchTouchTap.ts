/** Work around touchscreen taps that ripple without activating a checkbox.
 * A native non-passive listener is required: React's passive touch listener
 * cannot cancel the compatibility click after we explicitly activate the input.
 */
export function installSwitchTouchTap(root: HTMLElement, now = () => performance.now()) {
    let tap: { input: HTMLInputElement; id: number; x: number; y: number; start: number } | null = null;
    const inputAt = (target: EventTarget | null) => {
        if (!(target instanceof Element) || !root.contains(target)) return null;
        return root.querySelector<HTMLInputElement>('input[type="checkbox"]');
    };
    const cancel = () => { tap = null; };
    const start = (event: TouchEvent) => {
        cancel();
        if (event.touches.length !== 1) return;
        const input = inputAt(event.target);
        if (!input || input.disabled) return;
        const touch = event.touches[0];
        tap = { input, id: touch.identifier, x: touch.clientX, y: touch.clientY, start: now() };
    };
    const moved = (touch: Touch) => !tap || Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 12;
    const move = (event: TouchEvent) => {
        if (!tap) return;
        const touch = Array.from(event.touches).find(t => t.identifier === tap!.id);
        if (event.touches.length !== 1 || !touch || moved(touch)) cancel();
    };
    const end = (event: TouchEvent) => {
        if (!tap) return;
        const current = tap;
        const touch = Array.from(event.changedTouches).find(t => t.identifier === current.id);
        const valid = !event.touches.length && touch && !moved(touch) && now() - current.start <= 600;
        cancel();
        if (!valid || !event.cancelable || !current.input.isConnected || current.input.disabled
            || inputAt(event.target) !== current.input) return;
        event.preventDefault(); // Suppress the later synthesized click (one toggle only).
        event.stopPropagation();
        current.input.click(); // Preserve the normal checkbox/React onChange path.
    };
    root.addEventListener('touchstart', start, { capture: true, passive: true });
    root.addEventListener('touchmove', move, { capture: true, passive: true });
    root.addEventListener('touchend', end, { capture: true, passive: false });
    root.addEventListener('touchcancel', cancel, { capture: true, passive: true });
    return () => {
        cancel();
        root.removeEventListener('touchstart', start, true);
        root.removeEventListener('touchmove', move, true);
        root.removeEventListener('touchend', end, true);
        root.removeEventListener('touchcancel', cancel, true);
    };
}
