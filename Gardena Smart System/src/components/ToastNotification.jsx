import React, { useEffect } from 'react';

const ToastNotification = ({ message, type, id, onDismiss }) => {
	useEffect(() => {
		const timer = setTimeout(() => onDismiss(id), 5000);
		return () => clearTimeout(timer);
	}, [id, onDismiss]);

	return (
		<div className={`toast-notification ${type}`}>
			<span>{message}</span>
			<button className='btn btn--icon' onClick={() => onDismiss(id)}>
				×
			</button>
		</div>
	);
};

export default ToastNotification;
