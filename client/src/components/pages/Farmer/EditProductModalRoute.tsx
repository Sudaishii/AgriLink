import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditProductModal from './EditProductModal';

/**
 * Route wrapper for /farmer/edit-product/:id.
 * Renders the edit modal; on close/success navigates back to dashboard.
 */
const EditProductModalRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const goBack = () => navigate('/farmer/dashboard');

  return (
    <EditProductModal
      productId={id}
      isOpen={true}
      onClose={goBack}
      onSuccess={() => {
        window.dispatchEvent(new CustomEvent('product-updated'));
        goBack();
      }}
    />
  );
};

export default EditProductModalRoute;
