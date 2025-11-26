import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleUsers = [
  {
    name: 'John',
    surname: 'Doe',
    email: 'john.doe@example.com',
    profilePictureUrl: 'https://picsum.photos/seed/john/200/200.jpg',
    auctionCount: 8,
  },
  {
    name: 'Sarah',
    surname: 'Smith',
    email: 'sarah.smith@example.com',
    profilePictureUrl: 'https://picsum.photos/seed/sarah/200/200.jpg',
    auctionCount: 6,
  },
  {
    name: 'Mike',
    surname: 'Wilson',
    email: 'mike.wilson@example.com',
    profilePictureUrl: 'https://picsum.photos/seed/mike/200/200.jpg',
    auctionCount: 4,
  },
  {
    name: 'Emma',
    surname: 'Jones',
    email: 'emma.jones@example.com',
    profilePictureUrl: 'https://picsum.photos/seed/emma/200/200.jpg',
    auctionCount: 3,
  },
];

const auctionTemplates = [
  {
    title: 'Vintage Leica M3 Camera',
    description: 'Classic 1954 Leica M3 rangefinder camera in excellent condition. Fully functional with minor signs of use. Comes with original leather case and 50mm f/2 Summicron lens. Perfect for collectors and photography enthusiasts.',
    category: 'electronics',
    startingPrice: 1200.00,
  },
  {
    title: 'Apple iPhone 12 Pro - 128GB',
    description: 'Like-new iPhone 12 Pro in Pacific Blue. Excellent condition, always used with case and screen protector. Battery health at 92%. Includes original box, charger, and accessories.',
    category: 'electronics',
    startingPrice: 450.00,
  },
  {
    title: 'Sony WH-1000XM4 Wireless Headphones',
    description: 'Premium noise-canceling headphones in excellent condition. Excellent sound quality, 30-hour battery life. Includes original case, charging cable, and audio cable.',
    category: 'electronics',
    startingPrice: 180.00,
  },

  {
    title: 'First Edition Harry Potter Book',
    description: 'Harry Potter and the Philosopher\'s Stone, first edition hardcover. Some wear on dust jacket but pages in excellent condition. True first printing from 1997. A must-have for any Harry Potter collector.',
    category: 'collectibles',
    startingPrice: 850.00,
  },
  {
    title: '1965 Mickey Mantle Baseball Card',
    description: 'Topps 1965 Mickey Mantle card #350. Good condition with some edge wear. Centered well for the era. No major creases or stains. Graded VG-EX by reputable dealer.',
    category: 'collectibles',
    startingPrice: 650.00,
  },
  {
    title: 'Vintage Rolex Submariner Watch',
    description: '1978 Rolex Submariner reference 1680. Automatic movement in working condition. Some patina on dial consistent with age. Original bracelet with some stretch. Service history available.',
    category: 'collectibles',
    startingPrice: 8000.00,
  },

  {
    title: 'Abstract Oil Painting on Canvas',
    description: 'Original abstract expressionist painting, 24x36 inches. Mixed media on gallery-wrapped canvas. Ready to hang. Signed by artist, certificate of authenticity included.',
    category: 'art',
    startingPrice: 320.00,
  },
  {
    title: 'Limited Edition Photography Print',
    description: 'Limited edition (1/50) archival photography print by emerging artist. 16x20 inches, printed on Hahnemühle paper. Professionally framed in black wood frame.',
    category: 'art',
    startingPrice: 275.00,
  },
  {
    title: 'Handcrafted Ceramic Sculpture',
    description: 'Unique ceramic sculpture by local artist. One-of-a-kind piece, approximately 12 inches tall. Glazed in earth tones with textured finish. Perfect for modern interior.',
    category: 'art',
    startingPrice: 185.00,
  },

  {
    title: 'Vintage Chanel 2.55 Flap Bag',
    description: 'Authentic vintage Chanel medium flap bag in classic black caviar leather with gold hardware. Some minor wear consistent with age. Includes authenticity card and dust bag.',
    category: 'fashion',
    startingPrice: 4500.00,
  },
  {
    title: 'Designer Leather Jacket',
    description: 'Genuine leather motorcycle jacket by AllSaints. Size M, excellent condition. Distressed black leather with silver hardware. Worn only a few times, like new.',
    category: 'fashion',
    startingPrice: 380.00,
  },
  {
    title: 'Handmade Sterling Silver Necklace',
    description: 'Handcrafted sterling silver necklace with turquoise pendant. 18-inch chain with lobster clasp. Artisan-made, one of a kind design.',
    category: 'fashion',
    startingPrice: 125.00,
  },

  {
    title: 'Signed Stephen King Collection',
    description: 'Collection of 5 Stephen King first editions, all signed by the author. Includes Carrie, The Shining, IT, Pet Sematary, and Misery. All in very good condition with dust jackets.',
    category: 'books',
    startingPrice: 750.00,
  },
  {
    title: 'Rare Tolkien Set - The History of Middle Earth',
    description: 'Complete 12-volume set of The History of Middle Earth. Hardcovers with dust jackets in excellent condition. Out-of-print collection published 1983-1996.',
    category: 'books',
    startingPrice: 420.00,
  },

  {
    title: 'Professional Road Bike - Carbon Fiber',
    description: '2018 Specialized Tarmac SL6 carbon fiber road bike. Shimano Ultegra groupset, 56cm frame. Excellent condition, professionally maintained. Includes carbon wheels and power meter.',
    category: 'sports',
    startingPrice: 2200.00,
  },
  {
    title: 'Vintage Gibson Electric Guitar',
    description: '1978 Gibson Les Paul Standard in sunburst finish. Original electronics and hardware. Some play wear but structurally sound. Comes with original hard case.',
    category: 'sports',
    startingPrice: 3500.00,
  },

  {
    title: 'Antique Oak Writing Desk',
    description: 'Solid oak writing desk from early 1900s. Beautiful craftsmanship with dovetail joints. Some minor scratches consistent with age. Multiple drawers and compartments.',
    category: 'home',
    startingPrice: 680.00,
  },
  {
    title: 'Hand-woven Persian Rug',
    description: 'Authentic hand-woven Persian rug, 6x9 feet. Traditional design with rich reds and blues. 100% wool pile, excellent condition. Approx. 40 years old.',
    category: 'home',
    startingPrice: 890.00,
  },
];

function generateRandomEndTime(): Date {
  const now = new Date();
  const daysFromNow = Math.floor(Math.random() * 30) + 1;
  const endTime = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  endTime.setHours(hours, minutes, 0, 0);

  return endTime;
}

function generateBidsForAuction(
  auctionId: string,
  users: any[],
  startingPrice: number,
  endTime: Date
): any[] {
  const bids: any[] = [];
  const now = new Date();

  let bidCount: number;
  if (startingPrice < 200) {
    bidCount = Math.floor(Math.random() * 8) + 3;
  } else if (startingPrice < 1000) {
    bidCount = Math.floor(Math.random() * 10) + 5;
  } else {
    bidCount = Math.floor(Math.random() * 12) + 8;
  }

  const hoursRemaining = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursRemaining < 24) {
    bidCount = Math.max(bidCount - 2, 2);
  }

  if (bidCount === 0) return bids;

  const eligibleBidders = users.filter(u => u.email !== 'unknown@example.com');

  const numBidders = Math.min(bidCount, eligibleBidders.length);
  const selectedBidders = eligibleBidders
    .sort(() => Math.random() - 0.5)
    .slice(0, numBidders);

  let currentPrice = startingPrice;
  const auctionStart = new Date(endTime.getTime() - (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000);

  selectedBidders.forEach((bidder, index) => {
    let bidAmount: number;

    if (index === 0) {
      bidAmount = currentPrice + (currentPrice * 0.05) + Math.random() * 10;
    } else if (index === selectedBidders.length - 1) {
      bidAmount = currentPrice + (currentPrice * 0.1) + Math.random() * 50;
    } else {
      bidAmount = currentPrice + (currentPrice * 0.05) + Math.random() * 25;
    }

    bidAmount = Math.round(bidAmount * 100) / 100;

    const timeProgress = (index + 1) / (selectedBidders.length + 1);
    let bidTime = new Date(auctionStart.getTime() + timeProgress * (now.getTime() - auctionStart.getTime()));

    const timeVariation = (Math.random() - 0.5) * 4 * 60 * 60 * 1000;
    bidTime = new Date(bidTime.getTime() + timeVariation);

    if (bids.length > 0) {
      const lastBidTime = bids[bids.length - 1].createdAt;
      if (bidTime <= lastBidTime) {
        bidTime = new Date(lastBidTime.getTime() + 60 * 60 * 1000);
      }
    }
    if (bidTime > now) {
      bidTime = new Date(now.getTime() - Math.random() * 60 * 60 * 1000);
    }

    bids.push({
      id: `bid_${auctionId}_${index + 1}`,
      amount: bidAmount,
      auctionId,
      bidderId: bidder.id,
      createdAt: bidTime,
    });

    currentPrice = bidAmount;
  });

  return bids;
}

async function main() {

  try {
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    await prisma.user.deleteMany();

    const password = await bcrypt.hash('password123', 10);

    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          surname: userData.surname,
          email: userData.email,
          password,
          profile_picture_url: userData.profilePictureUrl,
        },
      });
      createdUsers.push(user);
    }

    const allAuctions = [];

    for (let i = 0; i < sampleUsers.length; i++) {
      const user = createdUsers[i];
      const userAuctionCount = sampleUsers[i].auctionCount;

      const selectedTemplates = [...auctionTemplates]
        .sort(() => Math.random() - 0.5)
        .slice(0, userAuctionCount);

      for (const template of selectedTemplates) {
        const auction = await prisma.auction.create({
          data: {
            title: template.title,
            description: template.description,
            startingPrice: template.startingPrice,
            endTime: generateRandomEndTime(),
            sellerId: user.id,
            imageUrl: `https://picsum.photos/seed/${template.category}-${Math.random()}/400/300.jpg`,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          },
        });

        allAuctions.push({ ...auction, template });
      }
    }

    let totalBids = 0;

    for (const auction of allAuctions) {
      const bids = generateBidsForAuction(
        auction.id,
        createdUsers,
        parseFloat(auction.startingPrice.toString()),
        auction.endTime
      );

      if (bids.length > 0) {
        await prisma.bid.createMany({
          data: bids,
        });
        totalBids += bids.length;
      }
    }

    createdUsers.forEach(user => {
      console.log(`   ${user.email} → password123`);
    });

  } catch (error) {
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });