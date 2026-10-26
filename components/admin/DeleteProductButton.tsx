'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { deleteOrArchiveProduct } from '@/app/admin/products/actions';

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

export default function DeleteProductButton({
  productId,
  productName,
}: DeleteProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await deleteOrArchiveProduct(productId);
      setOpen(false);
      router.refresh();
      if (result.warning) {
        window.alert(result.warning);
      } else if (result.result === 'archived') {
        window.alert('This product has order history, so it was archived instead of permanently deleted.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton size="small" color="error" onClick={() => { setError(''); setOpen(true); }}>
        <DeleteIcon />
      </IconButton>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Elimina Prodotto</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Remove “{productName}”? Products referenced by orders will be archived to preserve order history.
          </DialogContentText>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annulla</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
