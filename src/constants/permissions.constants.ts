export const PERMISSIONS = {
  SUBSCRIPTION: {
    VIEW: "subscription.view",
    EDIT: "subscription.edit",
  },
  DASHBOARD: {
    VIEW: "dashboard.view",
    EDIT: "dashboard.edit",
  },
  CLIENT: {
    VIEW: "client.view",
    EDIT: "client.edit",
  },
  PAYMENT: {
    VIEW: "payment.view",
    EDIT: "payment.edit",
  },
  BANNER: {
    VIEW: "banner.view",
    EDIT: "banner.edit",
  },
  LOGIN_HISTORY: {
    VIEW: "login_history.view",
    EDIT: "login_history.edit",
  },
  USER_ROLES: {
    VIEW: "user_roles.view",
    EDIT: "user_roles.edit",
  },
  IMPORT_DATA: {
    VIEW: "import_data.view",
    EDIT: "import_data.edit",
  },
  PROMO_CODE: {
    VIEW: "promo_code.view",
    EDIT: "promo_code.edit",
  },
};

export type PermissionString =
  | (typeof PERMISSIONS)["SUBSCRIPTION"]["VIEW"]
  | (typeof PERMISSIONS)["SUBSCRIPTION"]["EDIT"]
  | (typeof PERMISSIONS)["DASHBOARD"]["VIEW"]
  | (typeof PERMISSIONS)["DASHBOARD"]["EDIT"]
  | (typeof PERMISSIONS)["CLIENT"]["VIEW"]
  | (typeof PERMISSIONS)["CLIENT"]["EDIT"]
  | (typeof PERMISSIONS)["PAYMENT"]["VIEW"]
  | (typeof PERMISSIONS)["PAYMENT"]["EDIT"]
  | (typeof PERMISSIONS)["BANNER"]["VIEW"]
  | (typeof PERMISSIONS)["BANNER"]["EDIT"]
  | (typeof PERMISSIONS)["LOGIN_HISTORY"]["VIEW"]
  | (typeof PERMISSIONS)["LOGIN_HISTORY"]["EDIT"]
  | (typeof PERMISSIONS)["USER_ROLES"]["VIEW"]
  | (typeof PERMISSIONS)["USER_ROLES"]["EDIT"]
  | (typeof PERMISSIONS)["IMPORT_DATA"]["VIEW"]
  | (typeof PERMISSIONS)["IMPORT_DATA"]["EDIT"]
  | (typeof PERMISSIONS)["PROMO_CODE"]["VIEW"]
  | (typeof PERMISSIONS)["PROMO_CODE"]["EDIT"];
