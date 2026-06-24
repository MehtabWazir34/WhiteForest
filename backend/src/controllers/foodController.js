const FoodCategory = require('../models/FoodCategory');
const FoodItem = require('../models/FoodItem');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all active food categories
 * @route   GET /api/food/categories
 * @access  Public
 */
const getFoodCategories = asyncHandler(async (req, res) => {
  const categories = await FoodCategory.find({ isActive: true }).sort({ sortOrder: 1 });
  return ApiResponse.success(res, 200, 'Food categories fetched successfully', categories);
});

/**
 * @desc    Get food items, optionally filtered by category/search/vegetarian
 * @route   GET /api/food/items
 * @access  Public
 * Query: category, search, isVegetarian, page, limit
 */
const getFoodItems = asyncHandler(async (req, res) => {
  const { category, search, isVegetarian, page = 1, limit = 20 } = req.query;

  const filter = { isAvailable: true };
  if (category) filter.category = category;
  if (isVegetarian === 'true') filter.isVegetarian = true;
  if (search) filter.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    FoodItem.find(filter)
      .populate('category', 'name slug')
      .sort({ sortOrder: 1 })
      .skip(skip)
      .limit(Number(limit)),
    FoodItem.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Food items fetched successfully', items, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

/**
 * @desc    Get a single food item by ID
 * @route   GET /api/food/items/:id
 * @access  Public
 */
const getFoodItemById = asyncHandler(async (req, res) => {
  const item = await FoodItem.findById(req.params.id).populate('category', 'name slug');

  if (!item || !item.isAvailable) {
    return ApiResponse.error(res, 404, 'Food item not found');
  }

  return ApiResponse.success(res, 200, 'Food item fetched successfully', item);
});

/**
 * @desc    Create a food category (admin only)
 * @route   POST /api/admin/food/categories
 * @access  Private (Admin)
 */
const createFoodCategory = asyncHandler(async (req, res) => {
  const category = await FoodCategory.create(req.body);
  return ApiResponse.success(res, 201, 'Food category created successfully', category);
});

/**
 * @desc    Update a food category (admin only)
 * @route   PUT /api/admin/food/categories/:id
 * @access  Private (Admin)
 */
const updateFoodCategory = asyncHandler(async (req, res) => {
  const category = await FoodCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    return ApiResponse.error(res, 404, 'Food category not found');
  }

  return ApiResponse.success(res, 200, 'Food category updated successfully', category);
});

/**
 * @desc    Deactivate a food category (admin only)
 * @route   DELETE /api/admin/food/categories/:id
 * @access  Private (Admin)
 */
const deleteFoodCategory = asyncHandler(async (req, res) => {
  const category = await FoodCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });

  if (!category) {
    return ApiResponse.error(res, 404, 'Food category not found');
  }

  return ApiResponse.success(res, 200, 'Food category deactivated successfully', category);
});

/**
 * @desc    Get all food categories including inactive (admin only)
 * @route   GET /api/admin/food/categories
 * @access  Private (Admin)
 */
const adminGetAllFoodCategories = asyncHandler(async (req, res) => {
  const categories = await FoodCategory.find().sort({ sortOrder: 1 });
  return ApiResponse.success(res, 200, 'All food categories fetched successfully', categories);
});

/**
 * @desc    Create a food item (admin only)
 * @route   POST /api/admin/food/items
 * @access  Private (Admin)
 */
const createFoodItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.create(req.body);
  return ApiResponse.success(res, 201, 'Food item created successfully', item);
});

/**
 * @desc    Update a food item (admin only)
 * @route   PUT /api/admin/food/items/:id
 * @access  Private (Admin)
 */
const updateFoodItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!item) {
    return ApiResponse.error(res, 404, 'Food item not found');
  }

  return ApiResponse.success(res, 200, 'Food item updated successfully', item);
});

/**
 * @desc    Mark a food item unavailable (soft delete, admin only)
 * @route   DELETE /api/admin/food/items/:id
 * @access  Private (Admin)
 */
const deleteFoodItem = asyncHandler(async (req, res) => {
  const item = await FoodItem.findByIdAndUpdate(req.params.id, { isAvailable: false }, { new: true });

  if (!item) {
    return ApiResponse.error(res, 404, 'Food item not found');
  }

  return ApiResponse.success(res, 200, 'Food item marked unavailable successfully', item);
});

/**
 * @desc    Get all food items including unavailable ones (admin only)
 * @route   GET /api/admin/food/items
 * @access  Private (Admin)
 */
const adminGetAllFoodItems = asyncHandler(async (req, res) => {
  const items = await FoodItem.find().populate('category', 'name slug').sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'All food items fetched successfully', items);
});

module.exports = {
  getFoodCategories,
  getFoodItems,
  getFoodItemById,
  createFoodCategory,
  updateFoodCategory,
  deleteFoodCategory,
  adminGetAllFoodCategories,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  adminGetAllFoodItems,
};
