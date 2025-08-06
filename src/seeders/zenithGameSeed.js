const { ZenithGame, ZenithVendor } = require("../models");

/**
 * Seed function for Zenith games
 * Creates game records in the database
 */
const seedZenithGames = async () => {
  try {
    console.log("Starting to seed Zenith games...");

    // Load all vendors first and create a map for efficient lookup
    const vendors = await ZenithVendor.findAll();
    const vendorMap = new Map();

    vendors.forEach((vendor) => {
      vendorMap.set(vendor.code, vendor);
    });

    // Check if we have the required vendors
    const requiredVendors = ["PGS", "PP", "CQ9", "JL"];
    const missingVendors = requiredVendors.filter(
      (code) => !vendorMap.has(code)
    );

    if (missingVendors.length > 0) {
      console.error(
        `Required vendors missing: ${missingVendors.join(
          ", "
        )}. Please seed vendors first.`
      );
      throw new Error(`Missing vendors: ${missingVendors.join(", ")}`);
    }

    // Define game data array with fields corresponding to the model
    // Each array item: [gameCode, gameName, categoryCode, imageSquare, imageLandscape, languageCode, platformCode, currencyCode, vendorCode]
    const gamesData = [
      // PGS Games
      [
        "PGS_1",
        "Honey Trap of Diao Chan",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_1.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_1.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_100",
        "Candy Bonanza",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_100.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_100.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_101",
        "Rise of Apollo",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_101.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_101.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_102",
        "Mermaid Riches",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_102.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_102.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_103",
        "Crypto Gold",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_103.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_103.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_104",
        "Wild Bandito",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_104.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_104.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_105",
        "Heist Stakes",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_105.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_105.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_106",
        "Ways of the Qilin",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_106.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_106.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_107",
        "Legendary Monkey King",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_107.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_107.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],
      [
        "PGS_108",
        "Buffalo Win",
        "SLOTS",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_108.png",
        "https://assets.gasea168.com/game/PGS/Slots/PGS_108.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),JPY,KRW,PHP,THB,USDT,VND(K)",
        "PGS",
      ],

      // PP Games
      [
        "PP_1001",
        "Dragon Tiger",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1001.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1001.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_101",
        "Live Casino Lobby",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_101.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_101.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_1024",
        "Andar Bahar",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1024.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1024.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_104",
        "Lobby Baccarat",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_104.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_104.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_107",
        "Lobby Sicbo",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_107.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_107.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_108",
        "Lobby Dragon Tiger",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_108.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_108.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_1140",
        "Korean Speed Blackjack 1",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1140.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1140.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_1152",
        "Turkish Privé Lounge Blackjack 1",
        "LIVE",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1152.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1152.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pl,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_1301",
        "Spaceman",
        "MINI",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1301.png",
        "https://assets.gasea168.com/game/PP/LIVE/PP_1301.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],
      [
        "PP_1320",
        "Big Bass Crash",
        "MINI",
        "https://assets.gasea168.com/game/PP/Slots/PP_1320.png",
        "https://assets.gasea168.com/game/PP/Slots/PP_1320.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "PP",
      ],

      // CQ9 Games
      [
        "CQ9_1",
        "Fruit King",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_1.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_1.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,KRW,MYR,PHP",
        "CQ9",
      ],
      [
        "CQ9_10",
        "Lucky Bats",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_10.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_10.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "IDR(K),INR,KRW,MYR,PHP,VND(K)",
        "CQ9",
      ],
      [
        "CQ9_102",
        "Fruity Carnival",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_102.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_102.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,INR,KRW,MYR,PHP",
        "CQ9",
      ],
      [
        "CQ9_103",
        "Jewel Luxury",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_103.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_103.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,INR,KRW,MYR,PHP",
        "CQ9",
      ],
      [
        "CQ9_104",
        "Chicky Parm Parm",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_104.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_104.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,INR,KRW,MYR,PHP",
        "CQ9",
      ],
      [
        "CQ9_105",
        "Jumping mobile",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_105.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_105.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,INR,KRW,MYR,PHP,VND(K)",
        "CQ9",
      ],
      [
        "CQ9_1067",
        "GoldenEggsJP",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_1067.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_1067.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "INR,KRW,MYR,PHP",
        "CQ9",
      ],
      [
        "CQ9_1074",
        "TreasureBowlJP",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_1074.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_1074.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "INR,KRW,MYR,PHP",
        "CQ9",
      ],
      [
        "CQ9_108",
        "Jump Higher mobile",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_108.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_108.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,INR,KRW,MYR,PHP,VND(K)",
        "CQ9",
      ],
      [
        "CQ9_109",
        "Rave Jump mobile",
        "SLOTS",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_109.png",
        "https://assets.gasea168.com/game/CQ9/Slots/CQ9_109.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,INR,KRW,MYR,PHP,VND(K)",
        "CQ9",
      ],

      // JL Games
      [
        "JL_1",
        "Royal Fishing",
        "FISH",
        "https://assets.gasea168.com/game/JL/FISH/JL_1.png",
        "https://assets.gasea168.com/game/JL/FISH/JL_1.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_100",
        "Super Rich",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_100.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_100.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_101",
        "Medusa",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_101.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_101.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_102",
        "RomaX",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_102.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_102.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_103",
        "Golden Empire",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_103.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_103.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_106",
        "TWIN WINS",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_106.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_106.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_108",
        "Magic Lamp",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_108.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_108.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_109",
        "Fortune Gems",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_109.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_109.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_110",
        "Ali Baba",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_110.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_110.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
      [
        "JL_111",
        "Number King",
        "SLOTS",
        "https://assets.gasea168.com/game/JL/Slots/JL_111.png",
        "https://assets.gasea168.com/game/JL/Slots/JL_111.png",
        "de,en,es,fr,hi,hk,id,it,ja,ko,my,pt,ru,th,tl,tr,vi,zh",
        "H5,WEB",
        "BRL,IDR(K),INR,JPY,KRW,MYR,PHP,THB,USDT,VND(K)",
        "JL",
      ],
    ];

    // Tracking counters for reporting
    let gamesCreated = 0;
    let gamesSkipped = 0;
    let gamesByVendor = {};

    // Process each game in the data array
    for (const [
      gameCode,
      gameName,
      categoryCode,
      imageSquare,
      imageLandscape,
      languageCode,
      platformCode,
      currencyCode,
      vendorCode,
    ] of gamesData) {
      // Check if game already exists
      const existingGame = await ZenithGame.findOne({
        where: { gameCode },
      });

      if (existingGame) {
        console.log(`Game with code ${gameCode} already exists, skipping...`);
        gamesSkipped++;
        continue;
      }

      // Get the correct vendor from the map
      const vendor = vendorMap.get(vendorCode);

      if (!vendor) {
        console.error(
          `Vendor with code ${vendorCode} not found for game ${gameCode}, skipping...`
        );
        continue;
      }

      // Create the game with association to the correct vendor
      await ZenithGame.create({
        gameCode,
        gameName,
        categoryCode,
        imageSquare,
        imageLandscape,
        languageCode,
        platformCode,
        currencyCode,
        is_active: true,
        is_disabled: false,
        vendorId: vendor.id,
      });

      // Track vendor stats
      if (!gamesByVendor[vendorCode]) {
        gamesByVendor[vendorCode] = 0;
      }
      gamesByVendor[vendorCode]++;

      gamesCreated++;
      console.log(
        `Created game: ${gameName} (${gameCode}) for vendor ${vendorCode}`
      );
    }

    // Log summary statistics
    console.log("\n--- Seeding Summary ---");
    console.log(`Total games processed: ${gamesCreated + gamesSkipped}`);
    console.log(`Games created: ${gamesCreated}`);
    console.log(`Games skipped (already exist): ${gamesSkipped}`);
    console.log("\nGames created by vendor:");

    for (const [vendorCode, count] of Object.entries(gamesByVendor)) {
      console.log(`- ${vendorCode}: ${count} games`);
    }

    console.log("\nZenith games seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error seeding Zenith games:", error);
    throw error;
  }
};

// Export the seeding function
module.exports = seedZenithGames;

// Run seeder if called directly
if (require.main === module) {
  const { sequelize } = require("../models");

  sequelize
    .authenticate()
    .then(() => {
      console.log("Database connection established");
      return seedZenithGames();
    })
    .then(() => {
      console.log("Zenith games seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
