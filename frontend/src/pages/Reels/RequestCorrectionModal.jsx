import React from 'react';
import ComposeMessageModal from '../../components/Common/ComposeMessageModal';

export const RequestCorrectionModal = ({ isOpen = true, reel, onClose, onSuccess }) => {
  if (!isOpen || !reel) return null;

  return (
    <ComposeMessageModal
      isOpen={isOpen}
      onClose={onClose}
      initialReel={reel}
      initialMode="CORRECTION"
      onSuccess={onSuccess}
    />
  );
};

export default RequestCorrectionModal;
