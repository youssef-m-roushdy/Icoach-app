import { Op } from 'sequelize';
import {
  Store,
  StoreProduct,
  User,
  StoreStatus,
  ProductStatus,
} from '../models/sql/index.js';
import type {
  ProductMedia,
  StoreStatusValue,
  ProductStatusValue,
} from '../models/sql/index.js';
import { AppError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';

const USER_ATTRIBUTES = ['id', 'firstName', 'lastName', 'username', 'avatar', 'isActive'];

interface PaginationInput {
  page?: number | string;
  limit?: number | string;
}

function parsePagination(pagination: PaginationInput) {
  const rawPage = Number(pagination.page || 1);
  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const rawLimit = Number(pagination.limit || 20);
  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
  return { page, limit, offset: (page - 1) * limit };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class StoreService {
  static async createStore(userId: number, data: {
    name: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    address?: string;
  }) {
    const slug = generateSlug(data.name);

    const existing = await Store.findOne({
      where: { slug, isDeleted: false },
    });
    if (existing) {
      throw new ConflictError('A store with this name already exists');
    }

    const store = await Store.create({
      ownerId: userId,
      name: data.name,
      slug,
      description: data.description || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      website: data.website || null,
      address: data.address || null,
    });

    return store;
  }

  static async getStoreById(storeId: number, includeProducts: boolean = false) {
    const include: any[] = [{ model: User, as: 'owner', attributes: USER_ATTRIBUTES }];
    if (includeProducts) {
      include.push({
        model: StoreProduct,
        as: 'products',
        where: { isDeleted: false },
        required: false,
      });
    }

    const store = await Store.findOne({
      where: { id: storeId, isDeleted: false },
      include,
    });

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
  }

  static async getStoreBySlug(slug: string) {
    const store = await Store.findOne({
      where: { slug, isDeleted: false },
      include: [
        { model: User, as: 'owner', attributes: USER_ATTRIBUTES },
        {
          model: StoreProduct,
          as: 'products',
          where: { isDeleted: false, status: { [Op.in]: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] } },
          required: false,
        },
      ],
    });

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
  }

  static async listStores(pagination: PaginationInput, search?: string) {
    const { page, limit, offset } = parsePagination(pagination);

    const where: any = { isDeleted: false, status: StoreStatus.ACTIVE };
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await Store.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: USER_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  static async updateStore(userId: number, storeId: number, data: Partial<{
    name: string;
    description: string;
    contactEmail: string;
    contactPhone: string;
    website: string;
    address: string;
    status: StoreStatusValue;
    logo: string;
    cover: string;
  }>) {
    const store = await Store.findByPk(storeId);
    if (!store || store.isDeleted) {
      throw new NotFoundError('Store not found');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenError('Only the store owner can update this store');
    }

    if (data.status && !Object.values(StoreStatus).includes(data.status)) {
      throw new AppError('Invalid store status', 400);
    }

    const updateData: typeof data & { slug?: string } = { ...data };
    if (data.name) {
      updateData.slug = generateSlug(data.name);
      const existing = await Store.findOne({
        where: { slug: updateData.slug, isDeleted: false, id: { [Op.ne]: storeId } },
      });
      if (existing) {
        throw new ConflictError('A store with this name already exists');
      }
    }

    await store.update(updateData);
    return store;
  }

  static async deleteStore(userId: number, storeId: number) {
    const store = await Store.findByPk(storeId);
    if (!store || store.isDeleted) {
      throw new NotFoundError('Store not found');
    }

    if (store.ownerId !== userId) {
      throw new ForbiddenError('Only the store owner can delete this store');
    }

    await store.update({ isDeleted: true, deletedAt: new Date() });
    await StoreProduct.update(
      { isDeleted: true, deletedAt: new Date() },
      { where: { storeId } }
    );

    return { success: true };
  }

  // ==================== PRODUCTS ====================

  static async createProduct(storeId: number, ownerId: number, data: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    stock?: number;
    images?: ProductMedia[];
    category?: string;
    tags?: string[];
    status?: string;
  }) {
    const store = await Store.findByPk(storeId);
    if (!store || store.isDeleted) {
      throw new NotFoundError('Store not found');
    }

    if (store.ownerId !== ownerId) {
      throw new ForbiddenError('Only the store owner can add products');
    }

    const status: ProductStatusValue = Object.values(ProductStatus).includes(data.status as ProductStatusValue)
      ? (data.status as ProductStatusValue)
      : ProductStatus.ACTIVE;

    const product = await StoreProduct.create({
      storeId,
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency || 'USD',
      stock: data.stock ?? 0,
      images: data.images || [],
      status,
      category: data.category || null,
      tags: data.tags || [],
    });

    return product;
  }

  static async getProduct(productId: number) {
    const product = await StoreProduct.findOne({
      where: { id: productId, isDeleted: false },
      include: [{ model: Store, as: 'store' }],
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  static async listStoreProducts(storeId: number, pagination: PaginationInput) {
    const { page, limit, offset } = parsePagination(pagination);

    const { count, rows } = await StoreProduct.findAndCountAll({
      where: { storeId, isDeleted: false },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
  }

  static async updateProduct(productId: number, ownerId: number, data: Partial<{
    name: string;
    description: string;
    price: number;
    currency: string;
    stock: number;
    images: ProductMedia[];
    category: string;
    tags: string[];
    status: ProductStatusValue;
  }>) {
    const product = await StoreProduct.findByPk(productId, {
      include: [{ model: Store, as: 'store' }],
    });

    if (!product || product.isDeleted) {
      throw new NotFoundError('Product not found');
    }

    if ((product as any).store?.ownerId !== ownerId) {
      throw new ForbiddenError('Only the store owner can update this product');
    }

    if (data.status && !Object.values(ProductStatus).includes(data.status)) {
      throw new AppError('Invalid product status', 400);
    }

    await product.update(data);
    return product;
  }

  static async deleteProduct(productId: number, ownerId: number) {
    const product = await StoreProduct.findByPk(productId, {
      include: [{ model: Store, as: 'store' }],
    });

    if (!product || product.isDeleted) {
      throw new NotFoundError('Product not found');
    }

    if ((product as any).store?.ownerId !== ownerId) {
      throw new ForbiddenError('Only the store owner can delete this product');
    }

    await product.update({ isDeleted: true, deletedAt: new Date() });
    return { success: true };
  }
}

export default StoreService;