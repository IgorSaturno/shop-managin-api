import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { registerStore } from "./routes/register-store";
import { sendAuthLink } from "./routes/send-auth-link";
import { authenticateFromLink } from "./routes/authenticate-from-link";
import { signOut } from "./routes/sign-out";
import { getProfile } from "./routes/get-profile";
import { getManagedStore } from "./routes/get-managed-store";
import { getOrderDetails } from "./routes/get-order-details";
import { approveOrder } from "./routes/approve-order";
import { cancelOrder } from "./routes/cancel-order";
import { deliverOrder } from "./routes/deliver-order";
import { dispatchOrder } from "./routes/dispatch-order";
import { getOrders } from "./routes/get-orders";
import { getMonthReceipt } from "./routes/get-month-receipt";
import { getDayOrdersAmount } from "./routes/get-day-orders-amount";
import { getMonthOrdersAmount } from "./routes/get-month-orders-amount";
import { getMonthCanceledOrdersAmount } from "./routes/get-month-canceled-orders-amount";
import { getPopularProducts } from "./routes/get-popular-products";
import { getDailyReceiptInPeriod } from "./routes/get-daily-receipt-in-period";
import { updateProfile } from "./routes/update-profile";
import { getCustomers } from "./routes/get-customers";
import { getCustomerDetails } from "./routes/get-customers-details";
import { getCustomerHistory } from "./routes/get-customer-history";
import { getProducts } from "./routes/get-products";
import { getCategories } from "./routes/get-categories";
import { getTags } from "./routes/get-tags";
import { getProductDetails } from "./routes/get-product-details";
import { getBrands } from "./routes/get-brands";
import { deleteProduct } from "./routes/delete-product";
import { deleteCategory } from "./routes/delete-category";
import { createCategory } from "./routes/create-category";
import { deleteBrand } from "./routes/delete-brand";
import { createBrand } from "./routes/create-brand";
import { deleteTag } from "./routes/delete-tag";
import { createTag } from "./routes/create-tag";
import { updateProduct } from "./routes/update-product";
import { getCoupons } from "./routes/get-coupons";
import { createCoupon } from "./routes/create-coupon";
import { validateCoupon } from "./routes/validate-coupons";
import { deleteCoupon } from "./routes/delete-coupon";
import { updateCoupon } from "./routes/update-coupon";
import { createProduct } from "./routes/create-product";
import { uploadImages } from "./routes/upload-images";

const app = new Elysia().use(cors({ origin: "http://localhost:5173" }));

const routes = [
  registerStore,
  sendAuthLink,
  authenticateFromLink,
  signOut,
  getProfile,
  getManagedStore,
  getOrderDetails,
  approveOrder,
  cancelOrder,
  deliverOrder,
  dispatchOrder,
  getOrders,
  getMonthReceipt,
  getDayOrdersAmount,
  getMonthOrdersAmount,
  getMonthCanceledOrdersAmount,
  getPopularProducts,
  getDailyReceiptInPeriod,
  updateProfile,
  getCustomers,
  getCustomerDetails,
  getCustomerHistory,
  getProducts,
  getProductDetails,
  getCategories,
  getBrands,
  getTags,
  deleteProduct,
  deleteCategory,
  deleteBrand,
  deleteTag,
  createCategory,
  createBrand,
  createTag,
  updateProduct,
  getCoupons,
  createCoupon,
  deleteCoupon,
  updateCoupon,
  validateCoupon,
  createProduct,
  uploadImages,
] as const;

routes.forEach((route) => app.use(route));

app.onError(({ code, error, set }) => {
  console.error("⚠️ onError:", code, error);
  switch (code) {
    case "VALIDATION": {
      set.status = error.status;
      return error.toResponse();
    }
    case "NOT_FOUND": {
      return new Response(null, { status: 404 });
    }
    default: {
      console.error(error);
      return new Response(null, { status: 500 });
    }
  }
});

app.listen(3333, () => {
  console.log("🔥  HTTP server running!");
});
