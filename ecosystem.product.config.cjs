const productMongoUri = process.env.NYASA_PRODUCT_MONGODB_URI;

if (!productMongoUri) {
  throw new Error("NYASA_PRODUCT_MONGODB_URI must point to the separate product Atlas cluster.");
}

module.exports = {
  apps: [
    {
      name: "nyasa-product-api",
      cwd: "./apps/api",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4200,
        MONGODB_URI: productMongoUri,
        MONGODB_DB_NAME: "nyasa_product",
        WEB_ORIGIN: process.env.NYASA_PRODUCT_WEB_ORIGIN || "https://product.nyasa.xpresscure.com"
      }
    }
  ]
};
