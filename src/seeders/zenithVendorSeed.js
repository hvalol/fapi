const { ZenithVendor } = require("../models");

/**
 * Seed function for Zenith vendors
 * Creates vendor records in the database
 */
const seedZenithVendors = async () => {
  try {
    console.log("Starting to seed Zenith vendors...");

    // Define vendor data array
    const vendorData = [
      {
        name: "PP EN",
        code: "PP",
        categoryCode: "LIVE,MINI,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "PG Soft",
        code: "PGS",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
      },
      {
        name: "CQ9",
        code: "CQ9",
        categoryCode: "FISH,LIVE,SLOTS",
        currencyCode: "BRL,IDR(K),INR,KRW,MYR,PHP,VND(K)",
      },
      {
        name: "Jili",
        code: "JL",
        categoryCode: "FISH,MINI,POKER,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "FaChai",
        code: "FC",
        categoryCode: "FISH,SLOTS",
        currencyCode: "BRL,INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Spade Gaming",
        code: "SPDG",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,KRW,MYR",
      },
      {
        name: "JDB",
        code: "JDB",
        categoryCode: "FISH,POKER,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "QueenMaker",
        code: "QM",
        categoryCode: "POKER,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Netent",
        code: "EVONTT",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Evolution Live",
        code: "EVOLIVE",
        categoryCode: "LIVE",
        currencyCode: "BRL,JPY,KRW,MYR,PHP,THB",
      },
      {
        name: "GTF",
        code: "JDB-GTF",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Micro Gaming",
        code: "MG",
        categoryCode: "FISH,LIVE,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,MYR,PHP,THB",
      },
      {
        name: "Relax Gaming",
        code: "RG",
        categoryCode: "SLOTS",
        currencyCode: "BRL,INR,KRW,MYR,PHP,THB,USDT",
      },
      {
        name: "Habanero",
        code: "HB",
        categoryCode: "POKER,SLOTS",
        currencyCode: "BRL,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Alize Slots",
        code: "ALG",
        categoryCode: "MINI,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Evoplay",
        code: "EVOP",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "BNG",
        code: "BNG",
        categoryCode: "SLOTS",
        currencyCode: "BRL,KRW,MYR",
      },
      {
        name: "Ezugi",
        code: "EZUGI",
        categoryCode: "LIVE",
        currencyCode: "BRL,JPY,KRW,MYR,USDT",
      },
      {
        name: "Winfinity",
        code: "WIFY",
        categoryCode: "LIVE",
        currencyCode: "BRL,IDR(K),MYR,THB",
      },
      {
        name: "Big Time Gaming",
        code: "EVOBTG",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "NoLimit City",
        code: "EVONLC",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Red Tiger",
        code: "EVORT",
        categoryCode: "SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "PlayNGo",
        code: "PNG",
        categoryCode: "SLOTS",
        currencyCode: "MYR,PHP",
      },
      {
        name: "YellowBat",
        code: "YBNGO",
        categoryCode: "FISH,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,VND(K)",
      },
      {
        name: "3oaks",
        code: "IFG",
        categoryCode: "SLOTS",
        currencyCode: "BRL,PHP",
      },
      {
        name: "Spribe",
        code: "SPB",
        categoryCode: "MINI,POKER,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "AdvantPlay",
        code: "AP",
        categoryCode: "SLOTS",
        currencyCode: "BRL,KRW,MYR,VND(K)",
      },
      {
        name: "YeeBet",
        code: "YB",
        categoryCode: "LIVE",
        currencyCode: "BRL,INR,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Tada",
        code: "TD",
        categoryCode: "FISH,POKER",
        currencyCode: "BRL,INR,USDT",
      },
      {
        name: "Hacksaw",
        code: "HSD",
        categoryCode: "MINI,SLOTS",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Askmeslot",
        code: "AMBS",
        categoryCode: "FISH,SLOTS",
        currencyCode: "BRL,KRW,MYR,USDT",
      },
      {
        name: "Live88",
        code: "BB",
        categoryCode: "LIVE",
        currencyCode: "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
      },
      {
        name: "Bgaming",
        code: "GPKBG",
        categoryCode: "MINI,SLOTS",
        currencyCode: "KRW,MYR,THB,USDT,VND(K)",
      },
      {
        name: "7mojo",
        code: "GPK7MJ",
        categoryCode: "LIVE,SLOTS",
        currencyCode: "BRL,IDR(K),JPY,KRW,MYR,USDT",
      },
      {
        name: "CP Games",
        code: "CPG",
        categoryCode: "MINI,SLOTS",
        currencyCode: "BRL",
      },
      {
        name: "Turbo Games",
        code: "GPKTBG",
        categoryCode: "MINI",
        currencyCode: "KRW,MYR,THB,USDT",
      },
      {
        name: "EpicWin",
        code: "EW",
        categoryCode: "SLOTS",
        currencyCode: "BRL",
      },
      {
        name: "Booming",
        code: "GPKBM",
        categoryCode: "SLOTS",
        currencyCode: "KRW,THB,VND(K)",
      },
      {
        name: "Spinomenal",
        code: "GPKSPINO",
        categoryCode: "SLOTS",
        currencyCode: "KRW",
      },
      {
        name: "DB",
        code: "DB",
        categoryCode: "SLOTS",
        currencyCode: "BRL,MYR",
      },
      {
        name: "Live22",
        code: "LIVE22",
        categoryCode: "SLOTS",
        currencyCode: "BRL",
      },
      {
        name: "CG",
        code: "CG",
        categoryCode: "MINI,POKER,SLOTS",
        currencyCode: "BRL,IDR(K),PHP",
      },
      {
        name: "ThunderKick",
        code: "TK",
        categoryCode: "SLOTS",
        currencyCode: "BRL,PHP,VND(K)",
      },
      {
        name: "Aviatrix",
        code: "AVIA",
        categoryCode: "MINI",
        currencyCode: "BRL",
      },
      {
        name: "PushGaming",
        code: "GPKPG",
        categoryCode: "SLOTS",
        currencyCode: "KRW",
      },
      {
        name: "Alize Mini",
        code: "ALGM",
        categoryCode: "MINI",
        currencyCode: "KRW",
      },
      {
        name: "Lite",
        code: "LT",
        categoryCode: "MINI",
        currencyCode: "KRW",
      },
    ];

    // For each vendor in the data array, create a record in the database
    for (const vendor of vendorData) {
      // Set default values for is_active and is_disabled
      const vendorWithDefaults = {
        ...vendor,
        is_active: true,
        is_disabled: false,
      };

      // Check if vendor already exists
      const existingVendor = await ZenithVendor.findOne({
        where: { code: vendor.code },
      });

      if (existingVendor) {
        console.log(
          `Vendor with code ${vendor.code} already exists, skipping...`
        );
        continue;
      }

      // Create the vendor
      await ZenithVendor.create(vendorWithDefaults);
      console.log(`Created vendor: ${vendor.name} (${vendor.code})`);
    }

    console.log("Zenith vendors seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error seeding Zenith vendors:", error);
    throw error;
  }
};

// Export the seeding function
module.exports = seedZenithVendors;

// Run seeder if called directly
if (require.main === module) {
  const { sequelize } = require("../models");

  sequelize
    .authenticate()
    .then(() => {
      console.log("Database connection established");
      return seedZenithVendors();
    })
    .then(() => {
      console.log("Zenith vendors seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
