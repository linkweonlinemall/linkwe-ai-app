-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');

-- CreateEnum
CREATE TYPE "LicenceType" AS ENUM ('PERSONAL', 'COMMERCIAL', 'EXTENDED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('SINGLE_SESSION', 'MULTI_SESSION', 'RECURRING');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'VENDOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RealEstateType" AS ENUM ('LAND', 'HOUSE', 'APARTMENT', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "RealEstateListingType" AS ENUM ('FOR_SALE', 'FOR_RENT');

-- CreateEnum
CREATE TYPE "TitleType" AS ENUM ('FREEHOLD', 'LEASEHOLD', 'STATE_LEASE');

-- CreateEnum
CREATE TYPE "TenureType" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "LotSizeUnit" AS ENUM ('SQFT', 'ACRES');

-- CreateEnum
CREATE TYPE "VehicleListingType" AS ENUM ('FOR_SALE', 'FOR_RENT', 'FOR_HIRE');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "VehiclePriceUnit" AS ENUM ('FIXED', 'PER_DAY', 'PER_HOUR');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('NEW', 'USED', 'CERTIFIED_USED');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'SUV', 'TRUCK', 'VAN', 'COUPE', 'HATCHBACK', 'PICKUP');

-- CreateEnum
CREATE TYPE "DriveType" AS ENUM ('FWD', 'RWD', 'AWD', 'FOUR_WD');

-- CreateEnum
CREATE TYPE "FoodOutletType" AS ENUM ('RESTAURANT', 'TAKEAWAY', 'FOOD_TRUCK', 'BAKERY', 'CATERING');

-- CreateEnum
CREATE TYPE "PriceRange" AS ENUM ('BUDGET', 'MODERATE', 'UPSCALE');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('HOTEL', 'GUESTHOUSE', 'VILLA', 'APARTMENT', 'HOSTEL');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT');

-- CreateEnum
CREATE TYPE "ServicePriceType" AS ENUM ('FIXED', 'HOURLY', 'QUOTED');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "sku" TEXT,
    "stock" INTEGER,
    "condition" "ProductCondition",
    "brand" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "images" TEXT[],
    "weight" DOUBLE PRECISION,
    "weightUnit" "WeightUnit",
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "allowPickup" BOOLEAN NOT NULL DEFAULT false,
    "allowDelivery" BOOLEAN NOT NULL DEFAULT false,
    "returnPolicy" TEXT,
    "isDigital" BOOLEAN NOT NULL DEFAULT false,
    "digitalFileUrl" TEXT,
    "fileType" TEXT,
    "fileSizeKb" INTEGER,
    "downloadLimit" INTEGER,
    "downloadExpiryDays" INTEGER,
    "previewUrl" TEXT,
    "licenceType" "LicenceType",
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "bookingType" "BookingType",
    "sessionDuration" INTEGER,
    "advanceBookingDays" INTEGER,
    "cancellationHours" INTEGER,
    "maxGroupSize" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION,
    "stock" INTEGER,
    "images" TEXT[],
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAvailabilitySchedule" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMins" INTEGER NOT NULL,
    "slotBufferMins" INTEGER NOT NULL DEFAULT 0,
    "maxBookingsPerSlot" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAvailabilitySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAvailabilityOverride" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "customStartTime" TEXT,
    "customEndTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBookingSlot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxBookings" INTEGER NOT NULL,
    "currentBookings" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBookingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBooking" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "cancellationReason" TEXT,
    "cancelledBy" "CancelledBy",
    "cancelledAt" TIMESTAMP(3),
    "vendorNotes" TEXT,
    "customerNotes" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalDownload" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "firstDownloadAt" TIMESTAMP(3),
    "lastDownloadAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealEstate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "RealEstateType" NOT NULL,
    "listingType" "RealEstateListingType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "sizeSqFt" DOUBLE PRECISION,
    "lotSize" DOUBLE PRECISION,
    "lotSizeUnit" "LotSizeUnit",
    "yearBuilt" INTEGER,
    "floorLevel" INTEGER,
    "totalFloors" INTEGER,
    "furnished" BOOLEAN,
    "parkingSpaces" INTEGER,
    "isNewDevelopment" BOOLEAN NOT NULL DEFAULT false,
    "titleType" "TitleType",
    "propertyTax" DOUBLE PRECISION,
    "tenure" "TenureType",
    "depositRequired" DOUBLE PRECISION,
    "availableFrom" TIMESTAMP(3),
    "amenities" TEXT[],
    "nearbyAmenities" TEXT[],
    "images" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealEstate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "listingType" "VehicleListingType" NOT NULL,
    "condition" "VehicleCondition",
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "registrationYear" INTEGER,
    "colour" TEXT,
    "interiorColour" TEXT,
    "mileage" INTEGER,
    "engineSize" TEXT,
    "transmission" "Transmission" NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "bodyType" "BodyType",
    "driveType" "DriveType",
    "doors" INTEGER,
    "seatingCapacity" INTEGER,
    "features" TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" "VehiclePriceUnit" NOT NULL,
    "depositRequired" DOUBLE PRECISION,
    "minimumRentalDays" INTEGER,
    "insuranceIncluded" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TIMESTAMP(3),
    "driverIncluded" BOOLEAN NOT NULL DEFAULT false,
    "inspectionExpiry" TIMESTAMP(3),
    "images" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "region" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "organiserName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "venueName" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "region" TEXT,
    "capacity" INTEGER,
    "dressCode" TEXT,
    "ticketPrice" DOUBLE PRECISION,
    "ticketUrl" TEXT,
    "refundPolicy" TEXT,
    "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
    "registrationDeadline" TIMESTAMP(3),
    "ageRestriction" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "saleEnds" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "openingHours" JSONB,
    "entryFee" DOUBLE PRECISION,
    "priceNotes" TEXT,
    "amenities" TEXT[],
    "accessibility" BOOLEAN NOT NULL DEFAULT false,
    "ageRestriction" TEXT,
    "images" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "socialLinks" JSONB,
    "rating" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodOutlet" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cuisineType" TEXT[],
    "outletType" "FoodOutletType" NOT NULL,
    "priceRange" "PriceRange" NOT NULL,
    "tags" TEXT[],
    "openingHours" JSONB,
    "hasDelivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadius" DOUBLE PRECISION,
    "deliveryFee" DOUBLE PRECISION,
    "minimumOrder" DOUBLE PRECISION,
    "averageWaitTime" INTEGER,
    "hasPickup" BOOLEAN NOT NULL DEFAULT false,
    "hasDineIn" BOOLEAN NOT NULL DEFAULT false,
    "acceptsReservations" BOOLEAN NOT NULL DEFAULT false,
    "reservationUrl" TEXT,
    "menuUrl" TEXT,
    "allergenInfo" TEXT,
    "isHalal" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "phone" TEXT,
    "socialLinks" JSONB,
    "rating" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodOutlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "AccommodationType" NOT NULL,
    "tags" TEXT[],
    "pricePerNight" DOUBLE PRECISION NOT NULL,
    "weeklyRate" DOUBLE PRECISION,
    "monthlyRate" DOUBLE PRECISION,
    "cleaningFee" DOUBLE PRECISION,
    "securityDeposit" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "maxGuests" INTEGER NOT NULL,
    "minimumStay" INTEGER,
    "amenities" TEXT[],
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "availableFrom" TIMESTAMP(3),
    "cancellationPolicy" "CancellationPolicy",
    "instantBook" BOOLEAN NOT NULL DEFAULT false,
    "breakfastIncluded" BOOLEAN NOT NULL DEFAULT false,
    "petsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "smokingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "childrenAllowed" BOOLEAN NOT NULL DEFAULT true,
    "poolAccess" BOOLEAN NOT NULL DEFAULT false,
    "parkingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "socialLinks" JSONB,
    "rating" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "priceType" "ServicePriceType" NOT NULL,
    "price" DOUBLE PRECISION,
    "duration" INTEGER,
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "availableDays" TEXT[],
    "availableHours" TEXT,
    "responseTime" TEXT,
    "onlineSessionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "travelFee" DOUBLE PRECISION,
    "serviceArea" TEXT[],
    "experience" INTEGER,
    "qualifications" TEXT[],
    "languages" TEXT[],
    "portfolio" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "region" TEXT,
    "rating" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreContentRelationship" (
    "id" TEXT NOT NULL,
    "requestingStoreId" TEXT NOT NULL,
    "targetStoreId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreContentRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_isPublished_idx" ON "Product"("isPublished");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductAvailabilitySchedule_productId_idx" ON "ProductAvailabilitySchedule"("productId");

-- CreateIndex
CREATE INDEX "ProductAvailabilityOverride_productId_date_idx" ON "ProductAvailabilityOverride"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductBookingSlot_productId_idx" ON "ProductBookingSlot"("productId");

-- CreateIndex
CREATE INDEX "ProductBookingSlot_date_idx" ON "ProductBookingSlot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBookingSlot_productId_date_startTime_key" ON "ProductBookingSlot"("productId", "date", "startTime");

-- CreateIndex
CREATE INDEX "ProductBooking_productId_idx" ON "ProductBooking"("productId");

-- CreateIndex
CREATE INDEX "ProductBooking_customerId_idx" ON "ProductBooking"("customerId");

-- CreateIndex
CREATE INDEX "ProductBooking_slotId_idx" ON "ProductBooking"("slotId");

-- CreateIndex
CREATE INDEX "ProductBooking_status_idx" ON "ProductBooking"("status");

-- CreateIndex
CREATE INDEX "DigitalDownload_productId_idx" ON "DigitalDownload"("productId");

-- CreateIndex
CREATE INDEX "DigitalDownload_customerId_idx" ON "DigitalDownload"("customerId");

-- CreateIndex
CREATE INDEX "DigitalDownload_orderId_idx" ON "DigitalDownload"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RealEstate_slug_key" ON "RealEstate"("slug");

-- CreateIndex
CREATE INDEX "RealEstate_storeId_idx" ON "RealEstate"("storeId");

-- CreateIndex
CREATE INDEX "RealEstate_isPublished_idx" ON "RealEstate"("isPublished");

-- CreateIndex
CREATE INDEX "RealEstate_type_listingType_idx" ON "RealEstate"("type", "listingType");

-- CreateIndex
CREATE INDEX "RealEstate_region_idx" ON "RealEstate"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_slug_key" ON "Vehicle"("slug");

-- CreateIndex
CREATE INDEX "Vehicle_storeId_idx" ON "Vehicle"("storeId");

-- CreateIndex
CREATE INDEX "Vehicle_isPublished_idx" ON "Vehicle"("isPublished");

-- CreateIndex
CREATE INDEX "Vehicle_listingType_idx" ON "Vehicle"("listingType");

-- CreateIndex
CREATE INDEX "Vehicle_region_idx" ON "Vehicle"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_storeId_idx" ON "Event"("storeId");

-- CreateIndex
CREATE INDEX "Event_isPublished_idx" ON "Event"("isPublished");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_region_idx" ON "Event"("region");

-- CreateIndex
CREATE INDEX "EventTicketType_eventId_idx" ON "EventTicketType"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Place_slug_key" ON "Place"("slug");

-- CreateIndex
CREATE INDEX "Place_storeId_idx" ON "Place"("storeId");

-- CreateIndex
CREATE INDEX "Place_isPublished_idx" ON "Place"("isPublished");

-- CreateIndex
CREATE INDEX "Place_region_idx" ON "Place"("region");

-- CreateIndex
CREATE UNIQUE INDEX "FoodOutlet_slug_key" ON "FoodOutlet"("slug");

-- CreateIndex
CREATE INDEX "FoodOutlet_storeId_idx" ON "FoodOutlet"("storeId");

-- CreateIndex
CREATE INDEX "FoodOutlet_isPublished_idx" ON "FoodOutlet"("isPublished");

-- CreateIndex
CREATE INDEX "FoodOutlet_outletType_idx" ON "FoodOutlet"("outletType");

-- CreateIndex
CREATE INDEX "FoodOutlet_region_idx" ON "FoodOutlet"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Accommodation_slug_key" ON "Accommodation"("slug");

-- CreateIndex
CREATE INDEX "Accommodation_storeId_idx" ON "Accommodation"("storeId");

-- CreateIndex
CREATE INDEX "Accommodation_isPublished_idx" ON "Accommodation"("isPublished");

-- CreateIndex
CREATE INDEX "Accommodation_type_idx" ON "Accommodation"("type");

-- CreateIndex
CREATE INDEX "Accommodation_region_idx" ON "Accommodation"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_storeId_idx" ON "Service"("storeId");

-- CreateIndex
CREATE INDEX "Service_isPublished_idx" ON "Service"("isPublished");

-- CreateIndex
CREATE INDEX "Service_region_idx" ON "Service"("region");

-- CreateIndex
CREATE INDEX "StoreContentRelationship_requestingStoreId_idx" ON "StoreContentRelationship"("requestingStoreId");

-- CreateIndex
CREATE INDEX "StoreContentRelationship_targetStoreId_idx" ON "StoreContentRelationship"("targetStoreId");

-- CreateIndex
CREATE INDEX "StoreContentRelationship_status_idx" ON "StoreContentRelationship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreContentRelationship_requestingStoreId_targetStoreId_co_key" ON "StoreContentRelationship"("requestingStoreId", "targetStoreId", "contentType", "contentId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAvailabilitySchedule" ADD CONSTRAINT "ProductAvailabilitySchedule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAvailabilityOverride" ADD CONSTRAINT "ProductAvailabilityOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBookingSlot" ADD CONSTRAINT "ProductBookingSlot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBooking" ADD CONSTRAINT "ProductBooking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBooking" ADD CONSTRAINT "ProductBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ProductBookingSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDownload" ADD CONSTRAINT "DigitalDownload_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealEstate" ADD CONSTRAINT "RealEstate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicketType" ADD CONSTRAINT "EventTicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodOutlet" ADD CONSTRAINT "FoodOutlet_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreContentRelationship" ADD CONSTRAINT "StoreContentRelationship_requestingStoreId_fkey" FOREIGN KEY ("requestingStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreContentRelationship" ADD CONSTRAINT "StoreContentRelationship_targetStoreId_fkey" FOREIGN KEY ("targetStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
