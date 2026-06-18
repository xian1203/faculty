import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config';
import { Product, CreateProductInput, UpdateProductInput } from '../types';

/**
 * Product Service
 * Handles all product/inventory-related database operations
 */
export class ProductService {
  private static readonly COLLECTION = 'products';

  /**
   * Create new product
   * @admin Only admins can create products
   */
  static async createProduct(productData: CreateProductInput): Promise<string> {
    try {
      const newProduct = {
        ...productData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), newProduct);

      // Update the document with its own ID
      await updateDoc(docRef, { id: docRef.id });

      return docRef.id;
    } catch (error) {
      console.error('Create product error:', error);
      throw new Error('Failed to create product');
    }
  }

  /**
   * Get all products
   */
  static async getProducts(filters?: {
    category?: string;
    status?: 'in_stock' | 'low_stock' | 'out_of_stock';
    limitCount?: number;
  }): Promise<Product[]> {
    try {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (filters?.category) {
        constraints.push(where('category', '==', filters.category));
      }

      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.limitCount) {
        constraints.push(limit(filters.limitCount));
      }

      const q = query(collection(db, this.COLLECTION), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => doc.data() as Product);
    } catch (error) {
      console.error('Get products error:', error);
      throw new Error('Failed to fetch products');
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as Product;
    } catch (error) {
      console.error('Get product error:', error);
      throw new Error('Failed to fetch product');
    }
  }

  /**
   * Get product by SKU
   */
  static async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('sku', '==', sku),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Product;
    } catch (error) {
      console.error('Get product by SKU error:', error);
      throw new Error('Failed to fetch product');
    }
  }

  /**
   * Update product
   * @admin Only admins can update products
   */
  static async updateProduct(id: string, data: UpdateProductInput): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);

      // Auto-update status based on stock
      let status = data.status;
      if (data.stock !== undefined) {
        const product = await this.getProductById(id);
        const reorderLevel = data.reorderLevel ?? product?.reorderLevel ?? 10;

        if (data.stock === 0) {
          status = 'out_of_stock';
        } else if (data.stock <= reorderLevel) {
          status = 'low_stock';
        } else {
          status = 'in_stock';
        }
      }

      await updateDoc(docRef, {
        ...data,
        ...(status && { status }),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Update product error:', error);
      throw new Error('Failed to update product');
    }
  }

  /**
   * Update product stock
   */
  static async updateStock(id: string, quantity: number, operation: 'add' | 'subtract'): Promise<void> {
    try {
      const product = await this.getProductById(id);

      if (!product) {
        throw new Error('Product not found');
      }

      const newStock = operation === 'add'
        ? product.stock + quantity
        : product.stock - quantity;

      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }

      await this.updateProduct(id, { stock: newStock });
    } catch (error) {
      console.error('Update stock error:', error);
      throw error;
    }
  }

  /**
   * Delete product
   * @admin Only admins can delete products
   */
  static async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Delete product error:', error);
      throw new Error('Failed to delete product');
    }
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(): Promise<Product[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('status', 'in', ['low_stock', 'out_of_stock']),
        orderBy('stock', 'asc')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => doc.data() as Product);
    } catch (error) {
      console.error('Get low stock products error:', error);
      throw new Error('Failed to fetch low stock products');
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string): Promise<Product[]> {
    try {
      return await this.getProducts({ category });
    } catch (error) {
      console.error('Get products by category error:', error);
      throw new Error('Failed to fetch products by category');
    }
  }

  /**
   * Search products by name
   */
  static async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation - consider using Algolia or ElasticSearch for production
      const products = await this.getProducts();

      return products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Search products error:', error);
      throw new Error('Failed to search products');
    }
  }
}
