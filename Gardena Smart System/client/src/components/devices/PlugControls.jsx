import React from 'react';

const PlugControls = ({ onCommand, isSubmitting }) => {
	return (
		<div className='btn-group' style={{ justifyContent: 'center', marginTop: '1rem' }}>
			<button
				type='button'
				onClick={() => onCommand('turnOn')}
				className='btn btn--primary btn--rounded'
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Wysyłanie...' : 'Włącz'}
			</button>
			<button
				type='button'
				onClick={() => onCommand('turnOff')}
				className='btn btn--secondary btn--rounded'
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Wysyłanie...' : 'Wyłącz'}
			</button>
		</div>
	);
};

export default PlugControls;
