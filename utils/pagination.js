// Pagination utility function
const paginate = async (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    populate = '',
    select = ''
  } = options;

  // Calculate skip value
  const skip = (page - 1) * limit;

  // Build query
  let mongoQuery = model.find(query);

  // Apply population
  if (populate) {
    mongoQuery = mongoQuery.populate(populate);
  }

  // Apply field selection
  if (select) {
    mongoQuery = mongoQuery.select(select);
  }

  // Apply sorting
  mongoQuery = mongoQuery.sort(sort);

  // Execute query with pagination
  const docs = await mongoQuery.skip(skip).limit(limit);

  // Get total count
  const total = await model.countDocuments(query);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    docs,
    totalDocs: total,
    limit,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

// Build search query for courses
const buildCourseSearchQuery = (filters = {}) => {
  const query = {};

  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }

  // Level filter
  if (filters.level) {
    query.level = filters.level;
  }

  // Price range filter
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    query.price = {};
    if (filters.priceMin !== undefined) {
      query.price.$gte = filters.priceMin;
    }
    if (filters.priceMax !== undefined) {
      query.price.$lte = filters.priceMax;
    }
  }

  // Only show published courses for non-admin users
  if (!filters.includeUnpublished) {
    query.isPublished = true;
  }

  return query;
};

// Build sort options
const buildSortOptions = (sortParam) => {
  const sortOptions = {
    'title': { title: 1 },
    '-title': { title: -1 },
    'price': { price: 1 },
    '-price': { price: -1 },
    'created': { createdAt: 1 },
    '-created': { createdAt: -1 },
    'popularity': { 'enrollmentCount': -1 },
    'rating': { 'averageRating': -1 }
  };

  return sortOptions[sortParam] || { createdAt: -1 };
};

module.exports = {
  paginate,
  buildCourseSearchQuery,
  buildSortOptions
};