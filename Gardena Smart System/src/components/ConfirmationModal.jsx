import React from 'react';

const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
	return (
		<div className='modal-overlay'>
			<div className='modal-content'>
				<p className='modal-message'>{message}</p>
				<div className='modal-actions'>
					<button type='button' onClick={onConfirm} className='btn btn--danger btn--rounded'>
						OK
					</button>
					<button type='button' onClick={onCancel} className='btn btn--secondary btn--rounded'>
						Anuluj
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationModal;
