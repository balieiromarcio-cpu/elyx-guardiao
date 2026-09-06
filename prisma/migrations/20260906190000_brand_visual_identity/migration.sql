-- AlterTable: identidade visual da marca (cores, fontes, regras de imagem)
ALTER TABLE "Brand" ADD COLUMN     "colorPrimary" TEXT,
ADD COLUMN     "colorSecondary" TEXT,
ADD COLUMN     "colorBackground" TEXT,
ADD COLUMN     "colorAccent" TEXT,
ADD COLUMN     "colorText" TEXT,
ADD COLUMN     "fontDisplay" TEXT,
ADD COLUMN     "fontBody" TEXT,
ADD COLUMN     "imageRules" TEXT;
