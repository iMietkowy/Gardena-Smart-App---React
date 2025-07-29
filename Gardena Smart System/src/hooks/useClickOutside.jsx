import { useEffect } from 'react';

/**
 * Hook, który wykrywa kliknięcie poza określonymi elementami.
 * @param {Array<React.RefObject>} refs - Tablica referencji do elementów, które mają być ignorowane.
 * @param {Function} handler - Funkcja do wywołania po kliknięciu na zewnątrz.
 */
export const useClickOutside = (refs, handler) => {
    useEffect(() => {
        const listener = (event) => {
            const isClickInside = refs.some(ref => 
                ref.current && ref.current.contains(event.target)
            );

            if (isClickInside) {
                return; 
            }

         
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [refs, handler]); 
};