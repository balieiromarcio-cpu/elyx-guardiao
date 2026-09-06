-- CreateTable
CREATE TABLE "ShopifyConnection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "shop" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyConnection_pkey" PRIMARY KEY ("id")
);
