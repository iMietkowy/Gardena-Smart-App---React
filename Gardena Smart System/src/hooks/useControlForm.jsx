import { useState } from 'react';
import { useNotificationContext } from '../context/NotificationContext';

export const useControlForm = (onSendCommand) => {
    const { showToastNotification } = useNotificationContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [controlAction, setControlAction] = useState('');
    const [controlValue, setControlValue] = useState('');

    const handleSubmit = async (action, value, valueServiceId) => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSendCommand(action, value, valueServiceId);
            setControlAction('');
            setControlValue('');
        } catch (error) {
    } finally {
        setIsSubmitting(false);
    }
};

return {
    isSubmitting,
    controlAction,
    setControlAction,
    controlValue,
    setControlValue,
    handleSubmit,
    showToastNotification,
    showToastNotification,
};
};