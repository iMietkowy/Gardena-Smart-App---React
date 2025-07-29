
import React, { useState } from 'react';
import { getStatusInfo } from '../utils/statusUtils';

const ValveCard = ({ valve }) => {
  const [showValveDetails, setShowValveDetails] = useState(false);

  
  const renderStatus = (label, value) => {
    if (!value) return null;
    const { className, text } = getStatusInfo(value);
    return (
      <div className="status-grid-item">
        <span className="status-label">{label}:</span>
        <span className={`status-value ${className}`}>{text}</span>
      </div>
    );
  };

  return (
    <div className="valve-card">
      <h4>Zawór: {valve.attributes?.name?.value || valve.id.split(':').pop()}</h4>

      <button 
        onClick={() => setShowValveDetails(!showValveDetails)} 
        className="toggle-valve-details-btn"
      >
        {showValveDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
      </button>

      {showValveDetails && (
        <div className="valve-info-section">
            <p><strong>ID zaworu:</strong> {valve.id}</p>
            <p><strong>Typ:</strong> {valve.type}</p>
        </div>
      )}
      
     
      <div className="valve-state-section">
        <h5>Aktualny stan:</h5>
        <div className="status-grid">
          {renderStatus('Stan', valve.attributes?.state?.value)}
          {renderStatus('Aktywność', valve.attributes?.activity?.value)}
        </div>
      </div>
    </div>
  );
};

export default ValveCard;