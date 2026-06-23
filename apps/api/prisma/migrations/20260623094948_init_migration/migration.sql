-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "coverImageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardDefinitionId" TEXT NOT NULL,
    "limitation" TEXT,
    "gradeValue" INTEGER,
    "gradingCompany" TEXT,
    "notes" TEXT,
    "photoFrontUrl" TEXT,
    "photoBackUrl" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnedCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionCard" (
    "collectionId" TEXT NOT NULL,
    "ownedCardId" TEXT NOT NULL,

    CONSTRAINT "CollectionCard_pkey" PRIMARY KEY ("collectionId","ownedCardId")
);

-- CreateTable
CREATE TABLE "CardDefinition" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "rookieFlag" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "photoFrontUrl" TEXT,
    "photoBackUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardDefinitionPlayer" (
    "cardDefinitionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "CardDefinitionPlayer_pkey" PRIMARY KEY ("cardDefinitionId","playerId")
);

-- CreateTable
CREATE TABLE "CardType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Set" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "manufacturerId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Year" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "sportId" TEXT NOT NULL,
    "competitionId" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSlugCustom" BOOLEAN NOT NULL DEFAULT false,
    "sportId" TEXT NOT NULL,
    "nationality" TEXT,
    "dateOfBirth" DATE,
    "teamId" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_slug_key" ON "Collection"("userId", "slug");

-- CreateIndex
CREATE INDEX "OwnedCard_userId_idx" ON "OwnedCard"("userId");

-- CreateIndex
CREATE INDEX "OwnedCard_cardDefinitionId_idx" ON "OwnedCard"("cardDefinitionId");

-- CreateIndex
CREATE INDEX "CollectionCard_collectionId_idx" ON "CollectionCard"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionCard_ownedCardId_idx" ON "CollectionCard"("ownedCardId");

-- CreateIndex
CREATE INDEX "CardDefinition_setId_idx" ON "CardDefinition"("setId");

-- CreateIndex
CREATE INDEX "CardDefinition_cardTypeId_idx" ON "CardDefinition"("cardTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CardDefinition_setId_slug_key" ON "CardDefinition"("setId", "slug");

-- CreateIndex
CREATE INDEX "CardDefinitionPlayer_cardDefinitionId_idx" ON "CardDefinitionPlayer"("cardDefinitionId");

-- CreateIndex
CREATE INDEX "CardDefinitionPlayer_playerId_idx" ON "CardDefinitionPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CardType_name_key" ON "CardType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CardType_slug_key" ON "CardType"("slug");

-- CreateIndex
CREATE INDEX "Set_seriesId_idx" ON "Set"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Set_seriesId_slug_key" ON "Set"("seriesId", "slug");

-- CreateIndex
CREATE INDEX "Series_manufacturerId_idx" ON "Series"("manufacturerId");

-- CreateIndex
CREATE INDEX "Series_sportId_idx" ON "Series"("sportId");

-- CreateIndex
CREATE INDEX "Series_yearId_idx" ON "Series"("yearId");

-- CreateIndex
CREATE INDEX "Series_competitionId_idx" ON "Series"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Series_competitionId_yearId_slug_key" ON "Series"("competitionId", "yearId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_sportId_idx" ON "Competition"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Year_label_key" ON "Year"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Year_slug_key" ON "Year"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_slug_key" ON "Manufacturer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Team_sportId_idx" ON "Team"("sportId");

-- CreateIndex
CREATE INDEX "Team_competitionId_idx" ON "Team"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sportId_name_key" ON "Team"("sportId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "Player_sportId_idx" ON "Player"("sportId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCard" ADD CONSTRAINT "OwnedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCard" ADD CONSTRAINT "OwnedCard_cardDefinitionId_fkey" FOREIGN KEY ("cardDefinitionId") REFERENCES "CardDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCard" ADD CONSTRAINT "CollectionCard_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionCard" ADD CONSTRAINT "CollectionCard_ownedCardId_fkey" FOREIGN KEY ("ownedCardId") REFERENCES "OwnedCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardDefinition" ADD CONSTRAINT "CardDefinition_setId_fkey" FOREIGN KEY ("setId") REFERENCES "Set"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardDefinition" ADD CONSTRAINT "CardDefinition_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardDefinitionPlayer" ADD CONSTRAINT "CardDefinitionPlayer_cardDefinitionId_fkey" FOREIGN KEY ("cardDefinitionId") REFERENCES "CardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardDefinitionPlayer" ADD CONSTRAINT "CardDefinitionPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Set" ADD CONSTRAINT "Set_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
