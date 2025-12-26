export const routes = {
  vendor: {
    dashboard: '/vendor/dashboard',
    list: '/vendor/list',
    products: '/vendor/products',
  },

  manager: {
    dashboard: '/manager/dashboard',
    vendors: '/manager/vendors',
    products: '/manager/products',

    productView: '/manager/product',      
    vendorReview: '/manager/vendor-review', 

    categories: '/manager/category_management/categories',
    subcategories: '/manager/category_management/subcategories',
    subsubcategories: '/manager/category_management/subsubcategories',
  },

   warehouse: {
    dashboard: "/warehouse/dashboard",

    inventory: "/warehouse/inventory",

    stockIn: "/warehouse/stock/stockin",
    stockOut: "/warehouse/stock/stockout",
    stockAdjustment: "/warehouse/stock/stockadjustment",

    stockCreate: "/warehouse/stock/create",
    stockView: "/warehouse/stock/view/:id",
    stockEdit: "/warehouse/stock/edit/:id",

    fulfilment: {
      pending: "/warehouse/fulfilment/pending",
      dispatch: "/warehouse/fulfilment/dispatch",
      return: "/warehouse/fulfilment/return",
    },
  },
};
