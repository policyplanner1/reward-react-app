export const routes = {
  vendor: {
    dashboard: "/vendor/dashboard",
    onboarding: "/vendor/onboarding",

   products: {
    add: "/vendor/products/add",
    list: "/vendor/products/list",
    edit: "/vendor/products/edit/:id",
    review: "/vendor/products/review/:productId", 
    },
    productManagerList: "/vendor/product-managers",
  },
   manager: {
    dashboard: "/manager/dashboard",
    vendors: "/manager/vendors",
    products: "/manager/products",
    productView: "/manager/product/:id",
    vendorReview: "/manager/vendor-review/:id",
    categories: "/manager/category_management/categories",
    subcategories: "/manager/category_management/subcategories",
    subsubcategories: "/manager/category_management/subsubcategories",
  },
};
