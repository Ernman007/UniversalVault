const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const { BANK_NAME } = require("./bankConfig");

const swaggerDefinition = {
  openapi: "3.0.1",
  info: {
    title: "Banking System API",
    version: "1.0.0",
    description: `API documentation for the ${BANK_NAME} platform`,
  },
  servers: [
    {
      url: process.env.SWAGGER_SERVER_URL || "http://localhost:5000",
      description: "Default server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../models/*.js"),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: "Banking System API Docs",
};

module.exports = {
  swaggerSpec,
  swaggerUiOptions,
};
