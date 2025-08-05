import React from 'react';
const ConfirmationModal = ({
	title,
	message,
	onConfirm,
	onCancel,
	confirmButtonText = 'OK',
	cancelButtonText = 'Anuluj',
}) => {
	return (
		<div className='modal-overlay'>
			<div className='modal-content'>
				{title && <h4 className='modal-title'>{title}</h4>}
				{message && <p className='modal-message'>{message}</p>}
				<div className='modal-actions'>
					<button type='button' onClick={onConfirm} className='btn btn--danger btn--rounded'>
						{confirmButtonText}
					</button>
					<button type='button' onClick={onCancel} className='btn btn--secondary btn--rounded'>
						{cancelButtonText}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationModal;
