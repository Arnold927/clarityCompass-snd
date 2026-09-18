import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ComplaintsModal } from './complaints-modal';

interface ComplaintsEntryProps {
  className?: string;
  onToggle?: (isOpen: boolean) => void;
  variant?: 'icon' | 'full' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export const ComplaintsEntry: React.FC<ComplaintsEntryProps> = ({
  className = '',
  onToggle,
  variant = 'full',
  size = 'md',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = () => {
    setIsModalOpen(true);
    onToggle?.(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    onToggle?.(false);
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'icon':
        return (
          <button
            onClick={handleOpen}
            className={`rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              size === 'sm' ? 'p-1' : size === 'md' ? 'p-1.5' : 'p-2'
            } ${className}`}
            title="Community Feedback Management"
          >
            <MessageCircle className={size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'} />
          </button>
        );

      case 'minimal':
        return (
          <button
            onClick={handleOpen}
            className={`inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline focus:outline-none ${sizeClasses[size]} ${className}`}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Complaints
          </button>
        );

      case 'full':
      default:
        return (
          <button
            onClick={handleOpen}
            className={`inline-flex items-center bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${sizeClasses[size]} ${className}`}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Community Feedback Management
          </button>
        );
    }
  };

  return (
    <>
      {getButtonContent()}
      
      {/* Modal/Popup for Complaints */}
      {isModalOpen && (
        <ComplaintsModal onClose={handleClose} />
      )}
    </>
  );
};