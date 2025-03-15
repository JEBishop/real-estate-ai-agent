import type { RealEstateListing } from './types.js';

export const formatHtml = (listings: RealEstateListing[]) => {
    console.log('format')
    console.log(listings)
    return `<!DOCTYPE html>
<html>
<head>
    <title>Apartment Listings</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .grid-container { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 16px; 
        }
        .listing { 
            border: 1px solid #ccc; 
            padding: 10px; 
            border-radius: 5px; 
            background: #f9f9f9;
        }
        .title { font-size: 18px; font-weight: bold; }
        .price { font-size: 16px; color: green; }
        .details { font-size: 14px; color: #555; }
        img { width: 100%; max-width: 400px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Apartment Listings</h1>
    <div class='grid-container'>
        ${listings.map((listing: RealEstateListing) => `
        <div class='listing'>
            <img src='${listing?.imgSrc}' alt='Apartment Image'>
            <div class='title'><a href='${listing.detailUrl}' target='_blank'>${listing.address}</a></div>
            <div class='price'>${listing.price}</div>
            <div class='details'>${listing.bedrooms} Beds | ${listing.bathrooms} Baths | ${listing.area} sqft</div>
            <div class='details'>${listing.homeType} - ${listing.match_reason}</div>
        </div>
        `).join('')}
    </div>
</body>
</html>`.replace(/\s+/g, ' ').trim();
}


// export const formatMarkdown = (listings: RealEstateListing[]) => {
//     return `# Apartment Listing\n\n` +
//            `![Apartment Image](${apartment.imgSrc})\n\n` +
//            `## [${apartment.address}](${apartment.detailUrl})\n\n` +
//            `**Price:** ${apartment.price}\n\n` +
//            `**Bedrooms:** ${apartment.bedrooms} | **Bathrooms:** ${apartment.bathrooms} | **Area:** ${apartment.area} sqft\n\n` +
//            `**Type:** ${apartment.homeType}\n\n` +
//            `**Match Reason:** ${apartment.match_reason}\n\n`;
// }
