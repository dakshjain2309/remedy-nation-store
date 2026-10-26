'use server';

import { revalidatePath } from 'next/cache';
import { requireStoreAdmin } from '@/lib/admin/authorization';
import type { ProductImage } from '@/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRODUCT_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRODUCT_IMAGE_BUCKET = 'product-images';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function assertProductId(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error('Invalid product ID.');
  }
  return value;
}

function getImageStoragePath(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function getProductFields(formData: FormData) {
  const name = getString(formData, 'name');
  const description = getString(formData, 'description');
  const priceText = getString(formData, 'price');
  const compareAtPriceText = getString(formData, 'compare_at_price');
  const sku = getString(formData, 'sku');
  const categoryId = getString(formData, 'category_id');
  const stockText = getString(formData, 'stock_quantity');

  if (!name || name.length > 200) {
    throw new Error('Product name is required and must be 200 characters or fewer.');
  }
  if (description.length > 10000) {
    throw new Error('Description must be 10,000 characters or fewer.');
  }
  if (sku.length > 200) {
    throw new Error('SKU must be 200 characters or fewer.');
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(priceText)) {
    throw new Error('Enter a valid price with up to two decimal places.');
  }

  const price = Number(priceText);
  if (!Number.isFinite(price) || price > 99999999.99) {
    throw new Error('Price is outside the allowed range.');
  }

  let compareAtPrice: number | null = null;
  if (compareAtPriceText) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(compareAtPriceText)) {
      throw new Error('Enter a valid compare-at price with up to two decimal places.');
    }
    compareAtPrice = Number(compareAtPriceText);
    if (!Number.isFinite(compareAtPrice) || compareAtPrice > 99999999.99) {
      throw new Error('Compare-at price is outside the allowed range.');
    }
  }

  if (!/^\d+$/.test(stockText)) {
    throw new Error('Stock quantity must be a whole number.');
  }
  const stockQuantity = Number(stockText);
  if (!Number.isSafeInteger(stockQuantity) || stockQuantity > 2147483647) {
    throw new Error('Stock quantity is outside the allowed range.');
  }
  if (categoryId && !UUID_PATTERN.test(categoryId)) {
    throw new Error('Select a valid category.');
  }

  return {
    name,
    description: description || null,
    price,
    compare_at_price: compareAtPrice,
    sku: sku || null,
    category_id: categoryId || null,
    stock_quantity: stockQuantity,
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
  };
}

async function validateCategory(
  supabase: Awaited<ReturnType<typeof requireStoreAdmin>>,
  categoryId: string | null
) {
  if (!categoryId) return;
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();

  if (error) throw new Error(`Unable to validate category: ${error.message}`);
  if (!data) throw new Error('The selected category no longer exists.');
}

export async function updateProduct(formData: FormData): Promise<void> {
  const supabase = await requireStoreAdmin();
  const productId = assertProductId(getString(formData, 'product_id'));
  const fields = getProductFields(formData);
  await validateCategory(supabase, fields.category_id);

  const { data, error } = await supabase
    .from('products')
    .update(fields)
    .eq('id', productId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Unable to update product: ${error.message}`);
  if (!data) throw new Error('Product not found or update was not permitted.');

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath('/');
  revalidatePath('/products');
  const slug = getString(formData, 'slug');
  if (slug) revalidatePath(`/product/${slug}`);
}

export async function uploadProductImage(formData: FormData): Promise<ProductImage> {
  const supabase = await requireStoreAdmin();
  const productId = assertProductId(getString(formData, 'product_id'));
  const file = formData.get('image');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image to upload.');
  }
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Each image must be 5 MB or smaller.');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw new Error(`Unable to load product: ${productError.message}`);
  if (!product) throw new Error('Product not found.');

  const { data: imageRows, error: imagesError } = await supabase
    .from('product_images')
    .select('id, position')
    .eq('product_id', productId)
    .order('position', { ascending: true });

  if (imagesError) throw new Error(`Unable to load product images: ${imagesError.message}`);
  const currentImages = (imageRows ?? []) as Array<{ id: string; position: number }>;
  if ((currentImages?.length ?? 0) >= MAX_PRODUCT_IMAGES) {
    throw new Error(`A product can have at most ${MAX_PRODUCT_IMAGES} images.`);
  }

  const extension = file.type === 'image/png'
    ? 'png'
    : file.type === 'image/webp'
      ? 'webp'
      : 'jpg';
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Unable to upload image: ${uploadError.message}`);

  const { data: publicUrl } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(path);

  const position = currentImages?.reduce(
    (max, image) => Math.max(max, image.position),
    -1
  ) ?? -1;

  const { data: image, error: imageError } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      url: publicUrl.publicUrl,
      alt_text: product.name,
      position: position + 1,
    })
    .select('id, product_id, url, alt_text, position, created_at')
    .single();

  if (imageError) {
    const { error: cleanupError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([path]);
    const cleanupMessage = cleanupError
      ? ` Storage cleanup also failed: ${cleanupError.message}`
      : '';
    throw new Error(`Unable to save image record: ${imageError.message}.${cleanupMessage}`);
  }

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath('/');
  revalidatePath('/products');
  return image as ProductImage;
}

export async function reorderProductImages(
  productIdValue: string,
  orderedImageIds: string[]
): Promise<void> {
  const supabase = await requireStoreAdmin();
  const productId = assertProductId(productIdValue);

  if (
    !Array.isArray(orderedImageIds) ||
    orderedImageIds.length > MAX_PRODUCT_IMAGES ||
    orderedImageIds.some((id) => !UUID_PATTERN.test(id)) ||
    new Set(orderedImageIds).size !== orderedImageIds.length
  ) {
    throw new Error('Invalid product image order.');
  }

  const { data: existingImages, error: selectError } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', productId);

  if (selectError) throw new Error(`Unable to verify product images: ${selectError.message}`);
  const existingIds = new Set(
    ((existingImages ?? []) as Array<{ id: string }>).map((image) => image.id)
  );
  if (
    existingIds.size !== orderedImageIds.length ||
    orderedImageIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error('The image list changed. Refresh the page and try again.');
  }

  for (const [position, imageId] of orderedImageIds.entries()) {
    const { error } = await supabase
      .from('product_images')
      .update({ position })
      .eq('id', imageId)
      .eq('product_id', productId)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Image order could not be fully saved: ${error.message}. Refresh and check the order.`);
    }
  }

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath('/');
  revalidatePath('/products');
}

export async function removeProductImage(
  productIdValue: string,
  imageIdValue: string
): Promise<{ warning?: string }> {
  const supabase = await requireStoreAdmin();
  const productId = assertProductId(productIdValue);
  const imageId = assertProductId(imageIdValue);

  const { data: image, error: imageError } = await supabase
    .from('product_images')
    .select('id, url')
    .eq('id', imageId)
    .eq('product_id', productId)
    .maybeSingle();

  if (imageError) throw new Error(`Unable to load image: ${imageError.message}`);
  if (!image) throw new Error('Image not found.');

  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId)
    .select('id')
    .single();

  if (deleteError) throw new Error(`Unable to remove image: ${deleteError.message}`);

  const path = getImageStoragePath(image.url);
  let warning: string | undefined;
  if (!path) {
    warning = 'Image was removed from the product, but its storage path could not be identified for cleanup.';
  } else {
    const { error: storageError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([path]);
    if (storageError) {
      warning = `Image was removed from the product, but its storage file could not be deleted: ${storageError.message}`;
    }
  }

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath('/');
  revalidatePath('/products');
  return { warning };
}

export async function deleteOrArchiveProduct(
  productIdValue: string
): Promise<{ result: 'deleted' | 'archived'; warning?: string }> {
  const supabase = await requireStoreAdmin();
  const productId = assertProductId(productIdValue);

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();

  if (productError) throw new Error(`Unable to load product: ${productError.message}`);
  if (!product) throw new Error('Product not found.');

  const { count: directOrderCount, error: directOrderError } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (directOrderError) {
    throw new Error(`Unable to check product order history: ${directOrderError.message}`);
  }

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);

  if (variantsError) throw new Error(`Unable to check product variants: ${variantsError.message}`);

  let variantOrderCount = 0;
  const variantIds = ((variants ?? []) as Array<{ id: string }>).map((variant) => variant.id);
  if (variantIds.length > 0) {
    const { count, error } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .in('variant_id', variantIds);

    if (error) throw new Error(`Unable to check variant order history: ${error.message}`);
    variantOrderCount = count ?? 0;
  }

  if ((directOrderCount ?? 0) > 0 || variantOrderCount > 0) {
    const { data: archivedProduct, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(`Unable to archive product: ${error.message}`);
    if (!archivedProduct) throw new Error('Product could not be archived.');
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath('/');
    revalidatePath('/products');
    return { result: 'archived' };
  }

  const { data: images, error: imagesError } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', productId);
  if (imagesError) throw new Error(`Unable to load product images: ${imagesError.message}`);

  const { data: deletedProduct, error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .select('id')
    .maybeSingle();

  if (deleteError) throw new Error(`Unable to delete product: ${deleteError.message}`);
  if (!deletedProduct) throw new Error('Product not found or deletion was not permitted.');

  const imageRowsForCleanup = (images ?? []) as Array<{ url: string }>;
  const storagePaths = imageRowsForCleanup
    .map((image) => getImageStoragePath(image.url))
    .filter((path): path is string => path !== null);
  const hasUnknownPaths = storagePaths.length !== imageRowsForCleanup.length;
  let warning: string | undefined;

  if (storagePaths.length > 0) {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(storagePaths);
    if (error) warning = `Product was deleted, but some storage images could not be removed: ${error.message}`;
  }
  if (hasUnknownPaths) {
    warning = [
      warning,
      'Some image storage paths could not be identified and may need manual cleanup.',
    ].filter(Boolean).join(' ');
  }

  revalidatePath('/admin/products');
  revalidatePath('/');
  revalidatePath('/products');
  return { result: 'deleted', warning };
}
