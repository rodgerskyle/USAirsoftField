import { useEffect, useRef } from 'react';
import { activateReadyRental, rentalDraftProblem, rentalFieldDay, rentalPlayDate, needsRentalIntake } from './utils/rentalActivation';

export default function RentalActivationMonitor({ firebase, uid, forms }) {
    const latest = useRef(forms);
    const refresh = useRef(null);
    latest.current = forms;
    useEffect(() => {
        if (!uid || typeof firebase?.rentalGroup !== 'function') return undefined;
        let closed = false, running = false, timer;
        async function poll() {
            if (closed || running) return;
            clearTimeout(timer);
            running = true;
            try {
                if (document.hidden) return;
                for (const form of latest.current || []) {
                    if (closed) break;
                    if (form?.armoryVersion !== 1 || !needsRentalIntake(form) || rentalPlayDate(form)<rentalFieldDay() || rentalDraftProblem(form)) continue;
                    try { await activateReadyRental(firebase,uid,form); }
                    catch { /* A changed roster or a temporarily unavailable waiver is checked on the next pass. */ }
                }
            } finally {
                running=false;
                if (!closed) timer=setTimeout(poll,30000);
            }
        }
        refresh.current = poll;
        timer=setTimeout(poll,500);
        document.addEventListener('visibilitychange',poll);
        return () => { closed=true; clearTimeout(timer); refresh.current=null; document.removeEventListener('visibilitychange',poll); };
    }, [firebase,uid]);
    useEffect(() => {
        const timer=setTimeout(()=>refresh.current?.(),600);
        return ()=>clearTimeout(timer);
    },[forms]);
    return null;
}
