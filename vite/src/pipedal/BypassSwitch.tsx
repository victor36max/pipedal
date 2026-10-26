import { useEffect, useRef } from 'react';
import Switch, { SwitchProps } from '@mui/material/Switch';
import { installSwitchTouchTap } from './SwitchTouchTap';

/** Keep mouse/keyboard behavior, but explicitly activate short touchscreen taps. */
export default function BypassSwitch(props: SwitchProps) {
    const root = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (root.current) return installSwitchTouchTap(root.current);
    }, []);
    return <span ref={root} style={{ display: 'inline-flex' }}><Switch {...props} /></span>;
}
