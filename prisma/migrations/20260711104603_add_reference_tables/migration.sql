-- CreateTable
CREATE TABLE "nutrition_recommendations" (
    "id" TEXT NOT NULL,
    "stt" INTEGER,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "energyKcal" DOUBLE PRECISION,
    "referenceWeightKg" DOUBLE PRECISION,
    "physicalActivity" TEXT,
    "proteinMinG" DOUBLE PRECISION,
    "proteinMaxG" DOUBLE PRECISION,
    "lipidMin" DOUBLE PRECISION,
    "lipidMax" DOUBLE PRECISION,
    "glucidMin" DOUBLE PRECISION,
    "glucidMax" DOUBLE PRECISION,
    "vitA" DOUBLE PRECISION,
    "vitAType" TEXT,
    "vitD" DOUBLE PRECISION,
    "vitDType" TEXT,
    "vitE" DOUBLE PRECISION,
    "vitEType" TEXT,
    "vitK" DOUBLE PRECISION,
    "vitKType" TEXT,
    "vitB1" DOUBLE PRECISION,
    "vitB1Type" TEXT,
    "vitB2" DOUBLE PRECISION,
    "vitB2Type" TEXT,
    "vitB3" DOUBLE PRECISION,
    "vitB3Type" TEXT,
    "vitB5" DOUBLE PRECISION,
    "vitB5Type" TEXT,
    "vitB6" DOUBLE PRECISION,
    "vitB6Type" TEXT,
    "vitB9" DOUBLE PRECISION,
    "vitB9Type" TEXT,
    "vitB12" DOUBLE PRECISION,
    "vitB12Type" TEXT,
    "vitC" DOUBLE PRECISION,
    "vitCType" TEXT,
    "calcium" DOUBLE PRECISION,
    "calciumType" TEXT,
    "iron" DOUBLE PRECISION,
    "ironType" TEXT,
    "zinc" DOUBLE PRECISION,
    "zincType" TEXT,
    "magnesium" DOUBLE PRECISION,
    "magnesiumType" TEXT,
    "iodine" DOUBLE PRECISION,
    "iodineType" TEXT,
    "phosphorus" DOUBLE PRECISION,
    "phosphorusType" TEXT,
    "fiber" DOUBLE PRECISION,
    "fiberType" TEXT,
    "water" DOUBLE PRECISION,
    "waterType" TEXT,
    "sodium" DOUBLE PRECISION,
    "sodiumType" TEXT,
    "potassium" DOUBLE PRECISION,
    "potassiumType" TEXT,
    "chloride" DOUBLE PRECISION,
    "chlorideType" TEXT,

    CONSTRAINT "nutrition_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "targetGroup" TEXT NOT NULL,
    "diseaseGroup" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "energyMinKcal" DOUBLE PRECISION,
    "energyMaxKcal" DOUBLE PRECISION,
    "proteinMinG" DOUBLE PRECISION,
    "proteinMaxG" DOUBLE PRECISION,
    "lipidMinG" DOUBLE PRECISION,
    "lipidMaxG" DOUBLE PRECISION,
    "glucidMinG" DOUBLE PRECISION,
    "glucidMaxG" DOUBLE PRECISION,
    "sodiumMinMg" DOUBLE PRECISION,
    "sodiumMaxMg" DOUBLE PRECISION,
    "potassiumMinMg" DOUBLE PRECISION,
    "potassiumMaxMg" DOUBLE PRECISION,
    "waterMinMl" DOUBLE PRECISION,
    "waterMaxMl" DOUBLE PRECISION,
    "mealsMin" DOUBLE PRECISION,
    "mealsMax" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "diet_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_growth_standards" (
    "id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "ageYears" DOUBLE PRECISION,
    "ageMonths" DOUBLE PRECISION NOT NULL,
    "weightM3sd" DOUBLE PRECISION,
    "weightM2sd" DOUBLE PRECISION,
    "weightAvg" DOUBLE PRECISION,
    "weightP2sd" DOUBLE PRECISION,
    "weightP3sd" DOUBLE PRECISION,
    "heightM3sd" DOUBLE PRECISION,
    "heightM2sd" DOUBLE PRECISION,
    "heightAvg" DOUBLE PRECISION,
    "heightP2sd" DOUBLE PRECISION,
    "heightP3sd" DOUBLE PRECISION,

    CONSTRAINT "child_growth_standards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nutrition_recommendations_ageGroup_idx" ON "nutrition_recommendations"("ageGroup");

-- CreateIndex
CREATE INDEX "nutrition_recommendations_gender_idx" ON "nutrition_recommendations"("gender");

-- CreateIndex
CREATE INDEX "diet_codes_code_idx" ON "diet_codes"("code");

-- CreateIndex
CREATE INDEX "diet_codes_targetGroup_idx" ON "diet_codes"("targetGroup");

-- CreateIndex
CREATE INDEX "diet_codes_diseaseGroup_idx" ON "diet_codes"("diseaseGroup");

-- CreateIndex
CREATE INDEX "child_growth_standards_gender_idx" ON "child_growth_standards"("gender");

-- CreateIndex
CREATE INDEX "child_growth_standards_ageMonths_idx" ON "child_growth_standards"("ageMonths");
